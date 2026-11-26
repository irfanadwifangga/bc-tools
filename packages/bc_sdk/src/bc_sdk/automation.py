"""Read-only client helpers for Business Central Automation API v2.0."""

from collections.abc import AsyncIterator, Awaitable, Callable

import httpx

from .errors import BCRequestError
from .metadata import Metadata, MetadataEntity

AUTOMATION_ENTITIES = frozenset(
    {
        "users",
        "permissionSets",
        "userPermissionSets",
        "expandedPermissionSets",
        "accessControls",
        "usersPermissions",
        "userPermissions",
        "aggregatePermissionSets",
    }
)


class AutomationAPI:
    """Read-only access to allowlisted Business Central Automation API endpoints."""

    def __init__(
        self,
        *,
        company_id: str | None,
        read_metadata: Callable[[], Awaitable[bytes]],
        iter_records: Callable[
            [str, httpx.QueryParams | None], AsyncIterator[dict[str, object]]
        ],
    ) -> None:
        self._company_id = company_id
        self._metadata = Metadata(read_metadata)
        self._iter_records = iter_records

    async def list_metadata(self) -> list[MetadataEntity]:
        """Return entity sets and structural fields from Automation API $metadata."""
        return await self._metadata.list_entities()

    async def list_records(
        self,
        entity: str,
        *,
        company_scoped: bool = True,
        top: int | None = None,
        filter_expr: str | None = None,
    ) -> list[dict[str, object]]:
        """Read allowlisted Automation API records (GET-only)."""
        if entity not in AUTOMATION_ENTITIES:
            raise BCRequestError(
                "The Automation API endpoint is outside the configured scope."
            )
        if top is not None and (
            isinstance(top, bool) or not isinstance(top, int) or top < 1
        ):
            raise BCRequestError("The top option must be a positive integer.")
        cleaned_filter: str | None = None
        if filter_expr is not None:
            cleaned_filter = filter_expr.strip()
            if not cleaned_filter or not all(ch.isprintable() for ch in cleaned_filter):
                raise BCRequestError(
                    "The filter expression must be a non-empty printable string."
                )

        if company_scoped:
            if self._company_id is None:
                raise BCRequestError(
                    "Configure the demo company ID before reading company data."
                )
            path = f"companies({self._company_id})/{entity}"
        else:
            path = entity

        query_items: dict[str, str | int] = {}
        if top is not None:
            query_items["$top"] = top
        if cleaned_filter is not None:
            query_items["$filter"] = cleaned_filter
        params = httpx.QueryParams(query_items) if query_items else None
        results: list[dict[str, object]] = []
        async for row in self._iter_records(path, params):
            results.append(row)
            if top is not None and len(results) == top:
                break
        return results
