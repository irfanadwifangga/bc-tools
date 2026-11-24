import os

from bc_sdk import BCClient, BCSettings
from bc_sdk.errors import BCAuthError, BCError, BCNotFoundError, BCRateLimitError
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


def _error(status: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status, content=body.model_dump())


def _client() -> BCClient:
    settings = BCSettings.model_validate(
        {
            "tenant_id": os.getenv("BC_TENANT_ID"),
            "client_id": os.getenv("BC_CLIENT_ID"),
            "client_secret": os.getenv("BC_CLIENT_SECRET"),
            "environment": os.getenv("BC_ENVIRONMENT", "Sandbox"),
        }
    )
    return BCClient.from_settings(settings)


@router.get(
    "/entities",
    response_model=list[MetadataEntity],
    responses={status: {"model": ErrorResponse} for status in (404, 422, 429, 502)},
)
async def list_entities(request: Request) -> list[MetadataEntity] | JSONResponse:
    """Return the entity sets and structural fields of the configured Sandbox API."""
    if request.query_params:
        return _error(422, "INVALID_QUERY", "Katalog tidak menerima parameter query.")

    try:
        client = _client()
    except (ValidationError, BCError):
        return _error(502, "BC_CONFIG_ERROR", "Periksa konfigurasi sandbox di backend.")

    try:
        async with client:
            return await client.metadata.list_entities()
    except BCAuthError:
        return _error(502, "BC_AUTH_ERROR", "Akses metadata sandbox ditolak.")
    except BCNotFoundError:
        return _error(404, "BC_NOT_FOUND", "Metadata sandbox tidak ditemukan.")
    except BCRateLimitError:
        return _error(429, "BC_RATE_LIMITED", "Batas permintaan sandbox tercapai.")
    except BCError:
        return _error(502, "BC_UPSTREAM_ERROR", "Metadata sandbox gagal dibaca.")
