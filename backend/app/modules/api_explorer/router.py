import os
from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from bc_sdk import BCClient, BCSettings
from bc_sdk.errors import (
    BCAuthError,
    BCError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
)
from bc_sdk.metadata import MetadataEntity
from bc_sdk.models import Customer, Item
from bc_sdk.resources import (
    MAX_RECORD_NAME_LENGTH,
    MAX_RECORD_NUMBER_LENGTH,
    CompanyResource,
    RecordField,
    RecordOrder,
    is_valid_record_name,
    is_valid_record_number,
    parse_record_fields,
)
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

router = APIRouter(prefix="/api/v1/api-explorer", tags=["API Explorer"])


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, str] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


class _PreviewRecord(BaseModel):
    id: UUID | None = None
    number: str | None = None
    display_name: str | None = Field(default=None, serialization_alias="displayName")


class CustomerPreview(_PreviewRecord):
    pass


_PREVIEW_LIMIT = 5
_PREVIEW_LIMIT_VALUES = {str(value) for value in range(1, _PREVIEW_LIMIT + 1)}
_PREVIEW_QUERY_SCHEMA = {
    "parameters": [
        {
            "name": "limit",
            "in": "query",
            "required": False,
            "schema": {
                "type": "integer",
                "minimum": 1,
                "maximum": _PREVIEW_LIMIT,
                "default": _PREVIEW_LIMIT,
            },
        },
        {
            "name": "order",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "enum": [order.value for order in RecordOrder],
            },
        },
        {
            "name": "number",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "minLength": 1,
                "maxLength": MAX_RECORD_NUMBER_LENGTH,
            },
        },
        {
            "name": "name",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "minLength": 1,
                "maxLength": MAX_RECORD_NAME_LENGTH,
            },
        },
        {
            "name": "fields",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
            },
        },
        {
            "name": "count",
            "in": "query",
            "required": False,
            "schema": {
                "type": "boolean",
                "default": False,
            },
        },
    ]
}
CustomerPreviewList = Annotated[list[CustomerPreview], Field(max_length=_PREVIEW_LIMIT)]


class ItemPreview(_PreviewRecord):
    pass


ItemPreviewList = Annotated[list[ItemPreview], Field(max_length=_PREVIEW_LIMIT)]
_ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    status: {"model": ErrorResponse} for status in (404, 422, 429, 502)
}


def _error(status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status, content=body.model_dump())


def _client(*, require_company: bool, custom_api_route: str | None = None) -> BCClient:
    settings = BCSettings.model_validate(
        {
            "tenant_id": os.getenv("BC_TENANT_ID"),
            "client_id": os.getenv("BC_CLIENT_ID"),
            "client_secret": os.getenv("BC_CLIENT_SECRET"),
            "company_id": os.getenv("BC_COMPANY_ID") if require_company else None,
            "environment": os.getenv("BC_ENVIRONMENT", "Sandbox"),
            "custom_api_route": custom_api_route,
        }
    )
    if require_company and settings.company_id is None:
        raise BCRequestError("Configure the demo company ID for preview.")
    return BCClient.from_settings(settings)


async def _read[T](
    load: Callable[[BCClient], Awaitable[T]],
    label: str,
    *,
    require_company: bool = False,
    custom_api_route: str | None = None,
) -> T | JSONResponse:
    try:
        client = _client(
            require_company=require_company, custom_api_route=custom_api_route
        )
    except (ValidationError, BCError):
        return _error(502, "BC_CONFIG_ERROR", "Periksa konfigurasi sandbox di backend.")

    try:
        async with client:
            return await load(client)
    except BCAuthError:
        return _error(502, "BC_AUTH_ERROR", f"Akses {label} sandbox ditolak.")
    except BCNotFoundError:
        return _error(
            404, "BC_NOT_FOUND", f"{label.capitalize()} sandbox tidak ditemukan."
        )
    except BCRateLimitError:
        return _error(429, "BC_RATE_LIMITED", "Batas permintaan sandbox tercapai.")
    except BCError:
        return _error(
            502, "BC_UPSTREAM_ERROR", f"{label.capitalize()} sandbox gagal dibaca."
        )


@router.get(
    "/entities", response_model=list[MetadataEntity], responses=_ERROR_RESPONSES
)
async def list_entities(request: Request) -> list[MetadataEntity] | JSONResponse:
    """Return the entity sets and structural fields of the configured Sandbox API."""
    if request.query_params:
        return _error(422, "INVALID_QUERY", "Katalog tidak menerima parameter query.")
    return await _read(lambda client: client.metadata.list_entities(), "metadata")


@router.get(
    "/custom-entities", response_model=list[MetadataEntity], responses=_ERROR_RESPONSES
)
async def list_custom_entities(request: Request) -> list[MetadataEntity] | JSONResponse:
    """Return the catalog of the one locally configured custom API."""
    if request.query_params:
        return _error(422, "INVALID_QUERY", "Katalog tidak menerima parameter query.")
    route = os.getenv("BC_CUSTOM_API_ROUTE", "").strip()
    if not route:
        return []
    return await _read(
        lambda client: client.custom_metadata.list_entities(),
        "metadata custom API",
        custom_api_route=route,
    )


def _preview_query(
    request: Request,
) -> (
    tuple[
        int,
        RecordOrder | None,
        str | None,
        str | None,
        tuple[RecordField, ...] | None,
        bool,
    ]
    | None
):
    params = request.query_params
    if set(params) - {"limit", "order", "number", "name", "fields", "count"} or len(
        params.multi_items()
    ) != len(params):
        return None
    limit = params.get("limit", str(_PREVIEW_LIMIT))
    if limit not in _PREVIEW_LIMIT_VALUES:
        return None
    order = params.get("order")
    number = params.get("number")
    if number is not None and not is_valid_record_number(number):
        return None
    name = params.get("name")
    if name is not None and not is_valid_record_name(name):
        return None
    raw_count = params.get("count")
    if raw_count is not None and raw_count not in {"true", "false"}:
        return None
    raw_fields = params.get("fields")
    try:
        parsed_order = RecordOrder(order) if order is not None else None
        parsed_fields = (
            parse_record_fields(raw_fields) if raw_fields is not None else None
        )
        return (
            int(limit),
            parsed_order,
            number,
            name,
            parsed_fields,
            raw_count == "true",
        )
    except ValueError:
        return None


async def _sample_preview[RecordT: (Customer, Item), PreviewT: _PreviewRecord](
    resource: CompanyResource[RecordT],
    preview_model: type[PreviewT],
    limit: int,
    order: RecordOrder | None,
    number: str | None,
    name: str | None,
    fields: tuple[RecordField, ...] | None,
    include_count: bool,
    response: Response,
) -> list[PreviewT]:
    total_count: int | None = None
    if include_count:
        records, total_count = await resource.list_page(
            top=limit,
            order_by=order,
            number=number,
            name=name,
            fields=fields,
            include_count=True,
        )
    elif name is None and fields is None:
        records = await resource.list(top=limit, order_by=order, number=number)
    elif name is None:
        records = await resource.list(
            top=limit, order_by=order, number=number, fields=fields
        )
    elif fields is None:
        records = await resource.list(
            top=limit, order_by=order, number=number, name=name
        )
    else:
        records = await resource.list(
            top=limit, order_by=order, number=number, name=name, fields=fields
        )

    if total_count is not None:
        response.headers["X-Total-Count"] = str(total_count)
    return [
        preview_model(id=row.id, number=row.number, display_name=row.display_name)
        for row in records[:limit]
    ]


async def _run_preview[RecordT: (Customer, Item), PreviewT: _PreviewRecord](
    request: Request,
    response: Response,
    get_resource: Callable[[BCClient], CompanyResource[RecordT]],
    preview_model: type[PreviewT],
    label: str,
) -> list[PreviewT] | JSONResponse:
    query = _preview_query(request)
    if query is None:
        return _error(
            422,
            "INVALID_QUERY",
            "Periksa jumlah baris, urutan, nomor, nama, field, atau hitungan yang dipilih.",
        )
    return await _read(
        lambda client: _sample_preview(
            get_resource(client), preview_model, *query, response
        ),
        label,
        require_company=True,
    )


@router.get(
    "/customers/preview",
    response_model=CustomerPreviewList,
    response_model_exclude_none=True,
    responses=_ERROR_RESPONSES,
    openapi_extra=_PREVIEW_QUERY_SCHEMA,
)
async def preview_customers(
    request: Request, response: Response
) -> list[CustomerPreview] | JSONResponse:
    """Read up to five customers from the configured demo company."""
    return await _run_preview(
        request,
        response,
        lambda client: client.customers,
        CustomerPreview,
        "data customer",
    )


@router.get(
    "/items/preview",
    response_model=ItemPreviewList,
    response_model_exclude_none=True,
    responses=_ERROR_RESPONSES,
    openapi_extra=_PREVIEW_QUERY_SCHEMA,
)
async def preview_items(
    request: Request, response: Response
) -> list[ItemPreview] | JSONResponse:
    """Read up to five items from the configured demo company."""
    return await _run_preview(
        request, response, lambda client: client.items, ItemPreview, "data item"
    )
