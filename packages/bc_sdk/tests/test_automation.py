import asyncio
from collections.abc import Callable

import httpx
import pytest
from bc_sdk import BCClient
from bc_sdk.errors import BCRequestError

_TENANT = "00000000-0000-0000-0000-000000000001"
_COMPANY = "00000000-0000-0000-0000-000000000002"

_METADATA_XML = b"""<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Microsoft.NAV" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="permissionSet">
        <Property Name="roleId" Type="Edm.String" />
        <Property Name="displayName" Type="Edm.String" />
      </EntityType>
      <EntityContainer Name="NavService">
        <EntitySet Name="permissionSets" EntityType="Microsoft.NAV.permissionSet" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>"""


class _TokenProvider:
    async def get_token(self) -> str:
        return "mock-access-token"


def _client(
    handler: Callable[[httpx.Request], httpx.Response],
    company_id: str | None = _COMPANY,
) -> BCClient:
    return BCClient(
        tenant_id=_TENANT,
        environment="Sandbox",
        token_provider=_TokenProvider(),
        company_id=company_id,
        transport=httpx.MockTransport(handler),
    )


def test_automation_reads_metadata_from_microsoft_automation_v2() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert (
            request.url.path
            == f"/v2.0/{_TENANT}/Sandbox/api/microsoft/automation/v2.0/$metadata"
        )
        assert not request.url.query
        return httpx.Response(200, content=_METADATA_XML)

    async def run() -> list[str]:
        async with _client(handle, company_id=None) as client:
            entities = await client.automation.list_metadata()
            return [entity.name for entity in entities]

    assert asyncio.run(run()) == ["permissionSets"]


def test_automation_lists_allowlisted_records_with_paging_and_top() -> None:
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        expected_prefix = (
            f"/v2.0/{_TENANT}/Sandbox/api/microsoft/automation/v2.0/"
            f"companies({_COMPANY})/userPermissionSets"
        )
        assert request.url.path == expected_prefix
        if len(requests) == 1:
            assert request.url.params["$top"] == "2"
            return httpx.Response(
                200,
                json={
                    "value": [{"userSecurityId": "u1", "roleId": "D365 READ"}],
                    "@odata.nextLink": "?$skiptoken=page2",
                },
            )
        return httpx.Response(
            200,
            json={
                "value": [
                    {"userSecurityId": "u2", "roleId": "SUPER"},
                    {"userSecurityId": "u3", "roleId": "IGNORED"},
                ]
            },
        )

    async def run() -> list[dict[str, object]]:
        async with _client(handle) as client:
            return await client.automation.list_records("userPermissionSets", top=2)

    rows = asyncio.run(run())
    assert [row["roleId"] for row in rows] == ["D365 READ", "SUPER"]
    assert len(requests) == 2


def test_automation_supports_environment_scoped_records() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert (
            request.url.path
            == f"/v2.0/{_TENANT}/Sandbox/api/microsoft/automation/v2.0/users"
        )
        return httpx.Response(200, json={"value": [{"userName": "ADMIN"}]})

    async def run() -> list[dict[str, object]]:
        async with _client(handle, company_id=None) as client:
            return await client.automation.list_records("users", company_scoped=False)

    assert asyncio.run(run()) == [{"userName": "ADMIN"}]


def test_automation_rejects_disallowed_endpoints_and_invalid_inputs() -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        pytest.fail("Unexpected request")

    async def run() -> None:
        async with _client(handle) as client:
            with pytest.raises(BCRequestError, match="outside the configured scope"):
                await client.automation.list_records("customers")
            with pytest.raises(BCRequestError, match="outside the configured scope"):
                await client.automation.list_records("../v2.0/companies")
            with pytest.raises(BCRequestError, match="positive integer"):
                await client.automation.list_records("users", top=0)
            with pytest.raises(
                BCRequestError, match="outside the configured Sandbox scope"
            ):
                await client._get(
                    httpx.URL(
                        f"https://api.businesscentral.dynamics.com/v2.0/{_TENANT}"
                        "/Sandbox/api/microsoft/automation/v2.0/unknownEndpoint"
                    )
                )
        async with _client(handle, company_id=None) as client:
            with pytest.raises(BCRequestError, match="Configure the demo company"):
                await client.automation.list_records("permissionSets")

    asyncio.run(run())
