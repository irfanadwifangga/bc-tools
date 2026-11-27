"""HTTP routes for the read-only Change Analyzer schema snapshot module."""

import os

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ...core.bc import ERROR_RESPONSES, bc_error, read_bc
from .service import (
    SNAPSHOT_SOURCES,
    SchemaSnapshotResponse,
    SnapshotEndpoint,
    SnapshotSource,
    SnapshotSourceFilter,
    build_snapshot_response,
    read_standard_and_automation_endpoints,
    to_snapshot_endpoints,
)

router = APIRouter(prefix="/api/v1/change-analyzer", tags=["Change Analyzer"])

_SNAPSHOT_QUERY_SCHEMA = {
    "parameters": [
        {
            "name": "source",
            "in": "query",
            "required": False,
            "schema": {
                "type": "string",
                "enum": list(SNAPSHOT_SOURCES),
                "default": "all",
            },
        }
    ]
}


def _parse_source(request: Request) -> SnapshotSourceFilter | None:
    params = request.query_params
    if set(params) - {"source"} or len(params.multi_items()) != len(params):
        return None
    source = params.get("source", "all")
    if source not in SNAPSHOT_SOURCES:
        return None
    return source


@router.get(
    "/snapshot",
    response_model=SchemaSnapshotResponse,
    responses=ERROR_RESPONSES,
    openapi_extra=_SNAPSHOT_QUERY_SCHEMA,
)
async def get_schema_snapshot(
    request: Request,
) -> SchemaSnapshotResponse | JSONResponse:
    """Capture a read-only $metadata schema snapshot from Business Central Sandbox."""
    source = _parse_source(request)
    if source is None:
        return bc_error(
            422,
            "INVALID_QUERY",
            "Parameter source hanya menerima all, standard, custom, atau automation.",
        )

    include_standard = source in ("all", "standard")
    include_automation = source in ("all", "automation")
    include_custom = source in ("all", "custom")
    custom_route = os.getenv("BC_CUSTOM_API_ROUTE", "").strip() or None

    requested_sources: list[SnapshotSource] = []
    endpoints: list[SnapshotEndpoint] = []

    if include_standard or include_automation:
        if include_standard:
            requested_sources.append("standard")
        if include_automation:
            requested_sources.append("automation")
        base_result = await read_bc(
            lambda client: read_standard_and_automation_endpoints(
                client,
                include_standard=include_standard,
                include_automation=include_automation,
            ),
            "snapshot skema API",
        )
        if isinstance(base_result, JSONResponse):
            return base_result
        endpoints.extend(base_result)

    if include_custom:
        requested_sources.append("custom")
        if custom_route is not None:
            custom_result = await read_bc(
                lambda client: client.custom_metadata.list_entities(),
                "snapshot metadata custom API",
                custom_api_route=custom_route,
            )
            if isinstance(custom_result, JSONResponse):
                return custom_result
            endpoints.extend(to_snapshot_endpoints("custom", custom_result))

    return build_snapshot_response(
        sources=requested_sources,
        endpoints=endpoints,
        custom_api_route=custom_route if include_custom else None,
    )
