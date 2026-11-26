"""Shared Business Central client factory and error mapping helpers."""

import os
from collections.abc import Awaitable, Callable

from bc_sdk import BCClient, BCSettings
from bc_sdk.errors import (
    BCAuthError,
    BCError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
)
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, str] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    status: {"model": ErrorResponse} for status in (404, 422, 429, 502)
}


def bc_error(status: int, code: str, message: str) -> JSONResponse:
    """Return a JSONResponse matching the standard API error envelope."""
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status, content=body.model_dump())


def make_bc_client(
    *, require_company: bool, custom_api_route: str | None = None
) -> BCClient:
    """Build a read-only BCClient from environment configuration."""
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
        raise BCRequestError(
            "Configure the demo company ID before reading company data."
        )
    return BCClient.from_settings(settings)


async def read_bc[T](
    load: Callable[[BCClient], Awaitable[T]],
    label: str,
    *,
    require_company: bool = False,
    custom_api_route: str | None = None,
) -> T | JSONResponse:
    """Execute a read-only BC operation with standardized error mapping."""
    try:
        client = make_bc_client(
            require_company=require_company, custom_api_route=custom_api_route
        )
    except (ValidationError, BCError):
        return bc_error(
            502, "BC_CONFIG_ERROR", "Periksa konfigurasi sandbox di backend."
        )

    try:
        async with client:
            return await load(client)
    except BCAuthError:
        return bc_error(502, "BC_AUTH_ERROR", f"Akses {label} sandbox ditolak.")
    except BCNotFoundError:
        return bc_error(
            404, "BC_NOT_FOUND", f"{label.capitalize()} sandbox tidak ditemukan."
        )
    except BCRateLimitError:
        return bc_error(429, "BC_RATE_LIMITED", "Batas permintaan sandbox tercapai.")
    except BCError:
        return bc_error(
            502, "BC_UPSTREAM_ERROR", f"{label.capitalize()} sandbox gagal dibaca."
        )
