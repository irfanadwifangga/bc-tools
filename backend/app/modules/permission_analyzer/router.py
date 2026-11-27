"""HTTP routes for the read-only Permission Analyzer module."""

from typing import Literal, cast

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ...core.bc import ERROR_RESPONSES, bc_error, read_bc
from .service import (
    ACCESS_FILTERS,
    DIFF_KINDS,
    MAX_OBJECT_QUERY_LENGTH,
    OBJECT_TYPES,
    DiffQuery,
    ObjectAccessSearchResponse,
    ObjectSearchQuery,
    PermissionDiffResponse,
    PermissionTargetNotFoundError,
    PermissionUsersResponse,
    get_permission_diff,
    get_permission_users,
    search_object_access,
)

router = APIRouter(prefix="/api/v1/permission-analyzer", tags=["Permission Analyzer"])

_OBJECTS_QUERY_SCHEMA = {
    "parameters": [
        {
            "name": "query",
            "in": "query",
            "required": True,
            "schema": {
                "type": "string",
                "minLength": 1,
                "maxLength": MAX_OBJECT_QUERY_LENGTH,
            },
        },
        {
            "name": "object_type",
            "in": "query",
            "required": False,
            "schema": {"type": "string", "enum": list(OBJECT_TYPES)},
        },
        {
            "name": "access",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "enum": list(ACCESS_FILTERS),
                "default": "any",
            },
        },
        {
            "name": "company",
            "in": "query",
            "required": False,
            "schema": {"type": "string", "minLength": 1, "maxLength": 100},
        },
    ]
}

_DIFF_QUERY_SCHEMA = {
    "parameters": [
        {
            "name": "kind",
            "in": "query",
            "required": True,
            "schema": {"type": "string", "enum": list(DIFF_KINDS)},
        },
        {
            "name": "left",
            "in": "query",
            "required": True,
            "schema": {"type": "string", "minLength": 1, "maxLength": 120},
        },
        {
            "name": "right",
            "in": "query",
            "required": True,
            "schema": {"type": "string", "minLength": 1, "maxLength": 120},
        },
    ]
}


def _clean_text(raw: str | None, *, max_length: int) -> str | None:
    if raw is None or len(raw) > max_length:
        return None
    stripped = raw.strip()
    if not stripped or not all(ch.isprintable() for ch in raw):
        return None
    return stripped


def _parse_object_query(request: Request) -> ObjectSearchQuery | None:
    params = request.query_params
    if set(params) - {"query", "object_type", "access", "company"} or len(
        params.multi_items()
    ) != len(params):
        return None

    query = _clean_text(params.get("query"), max_length=MAX_OBJECT_QUERY_LENGTH)
    if query is None:
        return None

    object_type = params.get("object_type")
    if object_type is not None and object_type not in OBJECT_TYPES:
        return None

    access = params.get("access", "any")
    if access not in ACCESS_FILTERS:
        return None

    raw_company = params.get("company")
    company: str | None = None
    if raw_company is not None:
        company = _clean_text(raw_company, max_length=100)
        if company is None:
            return None

    return ObjectSearchQuery(
        query=query,
        object_type=object_type,
        access=access,
        company=company,
    )


def _parse_diff_query(request: Request) -> DiffQuery | None:
    params = request.query_params
    if set(params) - {"kind", "left", "right"} or len(params.multi_items()) != len(
        params
    ):
        return None

    kind = params.get("kind")
    if kind not in DIFF_KINDS:
        return None

    left = _clean_text(params.get("left"), max_length=120)
    right = _clean_text(params.get("right"), max_length=120)
    if left is None or right is None:
        return None

    return DiffQuery(
        kind=cast(Literal["user", "role"], kind),
        left=left,
        right=right,
    )


@router.get(
    "/users",
    response_model=PermissionUsersResponse,
    responses=ERROR_RESPONSES,
)
async def list_permission_users(
    request: Request,
) -> PermissionUsersResponse | JSONResponse:
    """List users, Entra applications, permission set assignments, and companies."""
    if request.query_params:
        return bc_error(
            422, "INVALID_QUERY", "Endpoint users tidak menerima parameter query."
        )
    return await read_bc(
        get_permission_users,
        "data izin pengguna",
        require_company=True,
    )


@router.get(
    "/objects",
    response_model=ObjectAccessSearchResponse,
    responses=ERROR_RESPONSES,
    openapi_extra=_OBJECTS_QUERY_SCHEMA,
)
async def search_objects(
    request: Request,
) -> ObjectAccessSearchResponse | JSONResponse:
    """Search who holds Read/Insert/Modify/Delete/Execute permissions on BC objects."""
    query = _parse_object_query(request)
    if query is None:
        return bc_error(
            422,
            "INVALID_QUERY",
            "Periksa kata kunci objek, tipe objek, jenis akses, atau company.",
        )
    return await read_bc(
        lambda client: search_object_access(client, query),
        "akses objek",
        require_company=True,
        timeout=45.0,
    )


@router.get(
    "/diff",
    response_model=PermissionDiffResponse,
    responses=ERROR_RESPONSES,
    openapi_extra=_DIFF_QUERY_SCHEMA,
)
async def diff_permissions(
    request: Request,
) -> PermissionDiffResponse | JSONResponse:
    """Compare effective roles and object permissions between two users or permission sets."""
    query = _parse_diff_query(request)
    if query is None:
        return bc_error(
            422,
            "INVALID_QUERY",
            "Periksa mode perbandingan serta target kiri dan kanan.",
        )
    try:
        return await read_bc(
            lambda client: get_permission_diff(client, query),
            "perbandingan izin",
            require_company=True,
            timeout=45.0,
        )
    except PermissionTargetNotFoundError as exc:
        return bc_error(404, "BC_NOT_FOUND", str(exc))
