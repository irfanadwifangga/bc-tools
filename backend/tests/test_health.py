import pytest
from fastapi.testclient import TestClient

from backend.app.main import app, create_app


def test_health_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [
        ("http://localhost:5173", True),
        ("http://127.0.0.1:5173", True),
        ("https://example.invalid", False),
    ],
)
def test_cors_allows_only_local_frontend_origins_and_exposes_total_count(
    origin: str, allowed: bool
) -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health", headers={"Origin": origin})

    assert response.status_code == 200
    if allowed:
        assert response.headers["access-control-allow-origin"] == origin
        assert "X-Total-Count" in response.headers["access-control-expose-headers"]
    else:
        assert "access-control-allow-origin" not in response.headers


def test_cors_uses_frontend_origin_env_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "FRONTEND_ORIGIN", " http://localhost:4173 , http://127.0.0.1:4173 "
    )
    with TestClient(create_app()) as client:
        allowed = client.get(
            "/api/v1/health", headers={"Origin": "http://127.0.0.1:4173"}
        )
        blocked = client.get(
            "/api/v1/health", headers={"Origin": "http://localhost:5173"}
        )

    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
    assert "access-control-allow-origin" not in blocked.headers
