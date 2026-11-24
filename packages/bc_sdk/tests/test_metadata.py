import asyncio

import httpx
import pytest
from bc_sdk import BCClient
from bc_sdk.errors import BCRequestError
from bc_sdk.metadata import MetadataEntity

_TENANT = "00000000-0000-0000-0000-000000000001"
_URL = f"https://api.businesscentral.dynamics.com/v2.0/{_TENANT}/Sandbox/api/v2.0/$metadata"
_XML = b"""<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo" Alias="D">
<EntityContainer Name="Catalog">
  <EntitySet Name="customers" EntityType="D.Customer"/>
  <EntitySet Name="buyers" EntityType="Demo.Customer"/>
</EntityContainer>
<EntityType Name="Customer" BaseType="D.Record">
  <Property Name="displayName" Type="Edm.String"/>
</EntityType>
<EntityType Name="Record"><Key><PropertyRef Name="id"/></Key>
  <Property Name="id" Type="Edm.Guid" Nullable="false"/>
</EntityType>
</Schema></edmx:DataServices></edmx:Edmx>"""


class _Provider:
    async def get_token(self) -> str:
        return "fixture"


def _list(document: bytes, status: int = 200) -> list[MetadataEntity]:
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.method == "GET"
        assert str(request.url) == _URL
        assert request.headers["Authorization"] == "Bearer fixture"
        return httpx.Response(
            status, content=document, headers={"Location": "https://example.invalid"}
        )

    async def run() -> list[MetadataEntity]:
        async with BCClient(
            tenant_id=_TENANT,
            environment="Sandbox",
            token_provider=_Provider(),
            transport=httpx.MockTransport(handle),
        ) as client:
            return await client.metadata.list_entities()

    try:
        return asyncio.run(run())
    finally:
        assert len(requests) == 1


def test_catalog_resolves_entity_sets_and_inherited_fields() -> None:
    entities = _list(_XML)
    assert [entity.name for entity in entities] == ["customers", "buyers"]
    for entity in entities:
        assert entity.entity_type == "Demo.Customer"
        assert [(field.name, field.type) for field in entity.fields] == [
            ("id", "Edm.Guid"),
            ("displayName", "Edm.String"),
        ]


@pytest.mark.parametrize(
    "document",
    [
        b"<broken",
        b"<html/>",
        _XML.replace(b'D.Customer"', b'D.Unknown"'),
        _XML.replace(b'BaseType="D.Record"', b'BaseType="D.Customer"'),
        b"<!DOCTYPE doc>" + _XML,
    ],
)
def test_rejects_malformed_or_unsupported_metadata(document: bytes) -> None:
    with pytest.raises(BCRequestError, match="metadata"):
        _list(document)


def test_metadata_does_not_follow_redirects() -> None:
    with pytest.raises(BCRequestError, match="302"):
        _list(b"", 302)
