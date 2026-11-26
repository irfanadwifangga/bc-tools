import os
from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from bc_sdk import BCClient, BCSettings, RecordOrder
from bc_sdk.errors import (
    BCAuthError,
    BCError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
)
from bc_sdk.metadata import MetadataEntity
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

router = APIRouter(prefix="/api/v1/api-explorer", tags=["API Explorer"])


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, str] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


class CustomerPreview(BaseModel):
    id: UUID
    number: str
    display_name: str = Field(serialization_alias="displayName")


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
    ]
}
CustomerPreviewList = Annotated[list[CustomerPreview], Field(max_length=_PREVIEW_LIMIT)]


class ItemPreview(BaseModel):
    id: UUID
    number: str
    display_name: str = Field(serialization_alias="displayName")


ItemPreviewList = Annotated[list[ItemPreview], Field(max_length=_PREVIEW_LIMIT)]
_ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    status: {"model": ErrorResponse} for status in (404, 422, 429, 502)
}


def _error(status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status, content=body.model_dump())


def _client(*, require_company: bool) -> BCClient:
    settings = BCSettings.model_validate(
        {
            "tenant_id": os.getenv("BC_TENANT_ID"),
            "client_id": os.getenv("BC_CLIENT_ID"),
            "client_secret": os.getenv("BC_CLIENT_SECRET"),
            "company_id": os.getenv("BC_COMPANY_ID") if require_company else None,
            "environment": os.getenv("BC_ENVIRONMENT", "Sandbox"),
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
) -> T | JSONResponse:
    try:
        client = _client(require_company=require_company)
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


def _preview_query(request: Request) -> tuple[int, RecordOrder | None] | None:
    params = request.query_params
    if set(params) - {"limit", "order"} or len(params.multi_items()) != len(params):
        return None
    limit = params.get("limit", str(_PREVIEW_LIMIT))
    if limit not in _PREVIEW_LIMIT_VALUES:
        return None
    order = params.get("order")
    try:
        return int(limit), RecordOrder(order) if order is not None else None
    except ValueError:
        return None


async def _sample_customers(
    client: BCClient, limit: int, order: RecordOrder | None
) -> list[CustomerPreview]:
    records = await client.customers.list(top=limit, order_by=order)
    return [
        CustomerPreview(id=row.id, number=row.number, display_name=row.display_name)
        for row in records[:limit]
    ]


@router.get(
    "/customers/preview",
    response_model=CustomerPreviewList,
    responses=_ERROR_RESPONSES,
    openapi_extra=_PREVIEW_QUERY_SCHEMA,
)
async def preview_customers(request: Request) -> list[CustomerPreview] | JSONResponse:
    """Read up to five customers from the configured demo company."""
    query = _preview_query(request)
    if query is None:
        return _error(
            422, "INVALID_QUERY", "Gunakan limit 1–5 dan pilihan urutan yang tersedia."
        )
    return await _read(
        lambda client: _sample_customers(client, *query),
        "data customer",
        require_company=True,
    )


async def _sample_items(
    client: BCClient, limit: int, order: RecordOrder | None
) -> list[ItemPreview]:
    records = await client.items.list(top=limit, order_by=order)
    return [
        ItemPreview(id=row.id, number=row.number, display_name=row.display_name)
        for row in records[:limit]
    ]


@router.get(
    "/items/preview",
    response_model=ItemPreviewList,
    responses=_ERROR_RESPONSES,
    openapi_extra=_PREVIEW_QUERY_SCHEMA,
)
async def preview_items(request: Request) -> list[ItemPreview] | JSONResponse:
    """Read up to five items from the configured demo company."""
    query = _preview_query(request)
    if query is None:
        return _error(
            422, "INVALID_QUERY", "Gunakan limit 1–5 dan pilihan urutan yang tersedia."
        )
    return await _read(
        lambda client: _sample_items(client, *query), "data item", require_company=True
    )
