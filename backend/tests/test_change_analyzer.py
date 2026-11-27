"""Tests for the read-only Change Analyzer schema snapshot module."""

from collections.abc import Iterator
from unittest.mock import AsyncMock, patch

import pytest
from bc_sdk.errors import BCAuthError, BCNotFoundError
from bc_sdk.metadata import MetadataEntity, MetadataField
from fastapi.testclient import TestClient

from backend.app.main import app

_FACTORY = "backend.app.core.bc.make_bc_client"
_ENDPOINT = "/api/v1/change-analyzer/snapshot"
_TENANT = "11111111-1111-1111-1111-111111111111"
_CLIENT = "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def sandbox_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("BC_TENANT_ID", _TENANT)
    monkeypatch.setenv("BC_CLIENT_ID", _CLIENT)
    monkeypatch.setenv("BC_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("BC_ENVIRONMENT", "Sandbox")
    monkeypatch.delenv("BC_COMPANY_ID", raising=False)
    monkeypatch.delenv("BC_CUSTOM_API_ROUTE", raising=False)
    yield


def _sample_standard() -> list[MetadataEntity]:
    return [
        MetadataEntity(
            name="items",
            entity_type="Microsoft.NAV.item",
            fields=[
                MetadataField(name="number", type="Edm.String"),
                MetadataField(name="id", type="Edm.Guid"),
            ],
        ),
        MetadataEntity(
            name="customers",
            entity_type="Microsoft.NAV.customer",
            fields=[
                MetadataField(name="displayName", type="Edm.String"),
                MetadataField(name="id", type="Edm.Guid"),
            ],
        ),
    ]


def _sample_automation() -> list[MetadataEntity]:
    return [
        MetadataEntity(
            name="usersPermissions",
            entity_type="Microsoft.NAV.usersPermissions",
            fields=[MetadataField(name="userName", type="Edm.String")],
        )
    ]


def _sample_custom() -> list[MetadataEntity]:
    return [
        MetadataEntity(
            name="demoCustomers",
            entity_type="Microsoft.NAV.demoCustomer",
            fields=[MetadataField(name="customCode", type="Edm.String")],
        )
    ]


def test_snapshot_returns_sorted_all_sources_including_custom(
    sandbox_env: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("BC_CUSTOM_API_ROUTE", "ptmis/demo/v1.0")
    seen_routes: list[str | None] = []

    def fake_factory(
        *,
        require_company: bool,
        custom_api_route: str | None = None,
        timeout: float = 10.0,
    ) -> AsyncMock:
        assert require_company is False
        assert timeout == 10.0
        seen_routes.append(custom_api_route)
        client = AsyncMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.__aexit__ = AsyncMock(return_value=None)
        client.metadata.list_entities = AsyncMock(return_value=_sample_standard())
        client.automation.list_metadata = AsyncMock(return_value=_sample_automation())
        client.custom_metadata.list_entities = AsyncMock(return_value=_sample_custom())
        return client

    with patch(_FACTORY, side_effect=fake_factory), TestClient(app) as http:
        res = http.get(_ENDPOINT)

    assert res.status_code == 200
    body = res.json()
    assert seen_routes == [None, "ptmis/demo/v1.0"]
    assert body["schemaVersion"] == 1
    assert body["environment"] == "Sandbox"
    assert body["customApiRoute"] == "ptmis/demo/v1.0"
    assert body["sources"] == ["standard", "automation", "custom"]
    assert [(e["source"], e["name"]) for e in body["endpoints"]] == [
        ("automation", "usersPermissions"),
        ("custom", "demoCustomers"),
        ("standard", "customers"),
        ("standard", "items"),
    ]
    assert [f["name"] for f in body["endpoints"][2]["fields"]] == ["displayName", "id"]


def test_snapshot_custom_returns_empty_when_unconfigured(sandbox_env: None) -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        res = http.get(_ENDPOINT, params={"source": "custom"})
        factory.assert_not_called()

    assert res.status_code == 200
    body = res.json()
    assert body["sources"] == ["custom"]
    assert body["customApiRoute"] is None
    assert body["endpoints"] == []


def test_snapshot_single_source_standard_does_not_call_automation(
    sandbox_env: None,
) -> None:
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.metadata.list_entities = AsyncMock(return_value=_sample_standard())
    client.automation.list_metadata = AsyncMock(return_value=_sample_automation())

    with patch(_FACTORY, return_value=client), TestClient(app) as http:
        res = http.get(_ENDPOINT, params={"source": "standard"})

    assert res.status_code == 200
    assert res.json()["sources"] == ["standard"]
    client.metadata.list_entities.assert_awaited_once()
    client.automation.list_metadata.assert_not_awaited()


def test_snapshot_rejects_invalid_queries_and_writes(sandbox_env: None) -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        bad_source = http.get(_ENDPOINT, params={"source": "invalid"})
        extra_param = http.get(_ENDPOINT, params={"source": "all", "extra": "1"})
        dup_param = http.get(f"{_ENDPOINT}?source=standard&source=custom")
        post_res = http.post(_ENDPOINT)
        factory.assert_not_called()

    for res in (bad_source, extra_param, dup_param):
        assert res.status_code == 422
        assert res.json()["error"]["code"] == "INVALID_QUERY"
    assert post_res.status_code == 405


def test_snapshot_maps_bc_errors(
    sandbox_env: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("BC_CUSTOM_API_ROUTE", "ptmis/demo/v1.0")
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.metadata.list_entities = AsyncMock(side_effect=BCAuthError("denied"))
    client.custom_metadata.list_entities = AsyncMock(
        side_effect=BCNotFoundError("missing")
    )

    with patch(_FACTORY, return_value=client), TestClient(app) as http:
        auth_res = http.get(_ENDPOINT, params={"source": "standard"})
        not_found_res = http.get(_ENDPOINT, params={"source": "custom"})

    assert auth_res.status_code == 502
    assert auth_res.json()["error"]["code"] == "BC_AUTH_ERROR"
    assert not_found_res.status_code == 404
    assert not_found_res.json()["error"]["code"] == "BC_NOT_FOUND"
