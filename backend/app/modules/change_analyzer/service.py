"""Build deterministic, read-only API schema snapshots from BC $metadata."""

from datetime import UTC, datetime
from typing import Literal

from bc_sdk import BCClient
from bc_sdk.metadata import MetadataEntity
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

SnapshotSource = Literal["standard", "custom", "automation"]
SnapshotSourceFilter = Literal["all", "standard", "custom", "automation"]
SNAPSHOT_SOURCES: tuple[SnapshotSourceFilter, ...] = (
    "all",
    "standard",
    "custom",
    "automation",
)


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class SnapshotField(_CamelModel):
    name: str
    type: str


class SnapshotEndpoint(_CamelModel):
    source: SnapshotSource
    name: str
    entity_type: str
    fields: list[SnapshotField]


class SchemaSnapshotResponse(_CamelModel):
    schema_version: int = 1
    captured_at: str
    environment: str = "Sandbox"
    custom_api_route: str | None = None
    sources: list[SnapshotSource]
    endpoints: list[SnapshotEndpoint]


def to_snapshot_endpoints(
    source: SnapshotSource, entities: list[MetadataEntity]
) -> list[SnapshotEndpoint]:
    """Normalize metadata entities into deterministically sorted snapshot items."""
    endpoints = [
        SnapshotEndpoint(
            source=source,
            name=entity.name,
            entity_type=entity.entity_type,
            fields=sorted(
                (
                    SnapshotField(name=field.name, type=field.type)
                    for field in entity.fields
                ),
                key=lambda item: (item.name.casefold(), item.name),
            ),
        )
        for entity in entities
    ]
    endpoints.sort(key=lambda item: (item.source, item.name.casefold(), item.name))
    return endpoints


def build_snapshot_response(
    *,
    sources: list[SnapshotSource],
    endpoints: list[SnapshotEndpoint],
    custom_api_route: str | None = None,
    captured_at: str | None = None,
) -> SchemaSnapshotResponse:
    """Assemble a schema snapshot response sorted across all requested sources."""
    ordered = sorted(
        endpoints,
        key=lambda item: (item.source, item.name.casefold(), item.name),
    )
    timestamp = captured_at or datetime.now(UTC).isoformat().replace("+00:00", "Z")
    return SchemaSnapshotResponse(
        captured_at=timestamp,
        custom_api_route=custom_api_route,
        sources=sources,
        endpoints=ordered,
    )


async def read_standard_and_automation_endpoints(
    client: BCClient,
    *,
    include_standard: bool,
    include_automation: bool,
) -> list[SnapshotEndpoint]:
    """Fetch standard and/or automation $metadata sequentially via bc_sdk."""
    endpoints: list[SnapshotEndpoint] = []
    if include_standard:
        endpoints.extend(
            to_snapshot_endpoints("standard", await client.metadata.list_entities())
        )
    if include_automation:
        endpoints.extend(
            to_snapshot_endpoints("automation", await client.automation.list_metadata())
        )
    return endpoints
