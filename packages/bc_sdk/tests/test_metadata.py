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


def _list(
    document: bytes, status: int = 200, custom_api_route: str | None = None
) -> list[MetadataEntity]:
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.method == "GET"
        expected = (
            _URL.replace("/api/v2.0/", f"/api/{custom_api_route}/")
            if custom_api_route
            else _URL
        )
        assert str(request.url) == expected
        assert request.headers["Authorization"] == "Bearer fixture"
        return httpx.Response(
            status, content=document, headers={"Location": "https://example.invalid"}
        )

    async def run() -> list[MetadataEntity]:
        async with BCClient(
            tenant_id=_TENANT,
            environment="Sandbox",
            token_provider=_Provider(),
            custom_api_route=custom_api_route,
            transport=httpx.MockTransport(handle),
        ) as client:
            metadata = client.custom_metadata if custom_api_route else client.metadata
            return await metadata.list_entities()

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


@pytest.mark.parametrize(
    "route", ["demoPublisher/demoGroup/v1.0", "demoPublisher/demoGroup/beta"]
)
def test_custom_metadata_reads_configured_route(route: str) -> None:
    entities = _list(_XML, custom_api_route=route)
    assert entities[0].name == "customers"
    assert entities[0].fields[0].type == "Edm.Guid"


@pytest.mark.parametrize(
    "route",
    [
        "https://example.invalid",
        "../demo/v1.0",
        "demo/group/v1.0?company=x",
        "demo/group/v1.0/$metadata",
        "demo/%2e%2e/v1.0",
        "Microsoft/automation/v2.0",
    ],
)
def test_rejects_invalid_custom_metadata_route(route: str) -> None:
    with pytest.raises(BCRequestError, match="Invalid custom API route"):
        BCClient(
            tenant_id=_TENANT,
            environment="Sandbox",
            token_provider=_Provider(),
            custom_api_route=route,
        )


def test_custom_metadata_does_not_follow_redirects() -> None:
    with pytest.raises(BCRequestError, match="302"):
        _list(b"", 302, "demoPublisher/demoGroup/v1.0")


def test_configured_custom_api_allows_only_metadata_without_query() -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        pytest.fail("Unexpected request")

    async def run() -> None:
        async with BCClient(
            tenant_id=_TENANT,
            environment="Sandbox",
            token_provider=_Provider(),
            custom_api_route="demoPublisher/demoGroup/v1.0",
            transport=httpx.MockTransport(handle),
        ) as client:
            base = _URL.replace("/api/v2.0/", "/api/demoPublisher/demoGroup/v1.0/")
            for url in [
                base.replace("$metadata", "customers"),
                base.replace("demoGroup", "otherGroup"),
                base + "?company=other",
            ]:
                with pytest.raises(BCRequestError, match="outside|query options"):
                    await client._request("GET", httpx.URL(url))

    asyncio.run(run())
