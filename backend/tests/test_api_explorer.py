from unittest.mock import AsyncMock, patch

import pytest
from bc_sdk.errors import (
    BCAuthError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
    BCServerError,
)
from bc_sdk.metadata import MetadataEntity, MetadataField
from fastapi.testclient import TestClient

from backend.app.main import app

_PATH = "/api/v1/api-explorer/entities"
_FACTORY = "backend.app.modules.api_explorer.router.BCClient.from_settings"


@pytest.fixture
def sandbox_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BC_TENANT_ID", "00000000-0000-0000-0000-000000000001")
    monkeypatch.setenv("BC_CLIENT_ID", "00000000-0000-0000-0000-000000000002")
    monkeypatch.setenv("BC_CLIENT_SECRET", "fixture")
    monkeypatch.setenv("BC_ENVIRONMENT", "Sandbox")


@pytest.mark.parametrize("empty", [False, True])
def test_catalog_returns_sdk_entities(sandbox_config: None, empty: bool) -> None:
    entity = MetadataEntity(
        name="customers",
        entity_type="Demo.Customer",
        fields=[MetadataField(name="id", type="Edm.Guid")],
    )
    with patch(_FACTORY) as factory, TestClient(app) as http:
        client = factory.return_value
        client.metadata.list_entities = AsyncMock(
            return_value=[] if empty else [entity]
        )
        response = http.get(_PATH)
        assert response.status_code == 200
        assert response.json() == (
            []
            if empty
            else [
                {
                    "name": "customers",
                    "entity_type": "Demo.Customer",
                    "fields": [{"name": "id", "type": "Edm.Guid"}],
                }
            ]
        )
        client.metadata.list_entities.assert_awaited_once_with()
        client.__aexit__.assert_awaited_once()


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (BCAuthError, 502, "BC_AUTH_ERROR"),
        (BCNotFoundError, 404, "BC_NOT_FOUND"),
        (BCRateLimitError, 429, "BC_RATE_LIMITED"),
        (BCServerError, 502, "BC_UPSTREAM_ERROR"),
        (BCRequestError, 502, "BC_UPSTREAM_ERROR"),
    ],
)
def test_catalog_translates_sdk_errors(
    sandbox_config: None, error: type[Exception], status: int, code: str
) -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        client = factory.return_value
        client.metadata.list_entities = AsyncMock(
            side_effect=error("private-fixture-detail")
        )
        response = http.get(_PATH)
        client.__aexit__.assert_awaited_once()
    assert response.status_code == status
    detail = response.json()["error"]
    assert detail["code"] == code
    assert detail["details"] == {}
    assert detail["message"] and "private-fixture-detail" not in response.text


def test_missing_config_is_sanitized(
    sandbox_config: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("BC_TENANT_ID")
    with patch(_FACTORY) as factory, TestClient(app) as http:
        response = http.get(_PATH)
        factory.assert_not_called()
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "BC_CONFIG_ERROR"
    assert "fixture" not in response.text


def test_catalog_rejects_query_and_write_before_sdk_creation() -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        response = http.get(_PATH, params={"url": "https://example.invalid"})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "INVALID_QUERY"
        assert http.post(_PATH).status_code == 405
        factory.assert_not_called()
