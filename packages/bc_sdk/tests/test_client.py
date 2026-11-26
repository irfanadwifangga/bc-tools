import asyncio
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from bc_sdk.client import BCClient
from bc_sdk.errors import (
    BCAuthError,
    BCError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
    BCServerError,
)

_TENANT = "00000000-0000-0000-0000-000000000001"
_COMPANY = "00000000-0000-0000-0000-000000000002"
_API = f"https://api.businesscentral.dynamics.com/v2.0/{_TENANT}/Sandbox/api/v2.0"
_DETAIL = "synthetic-response-detail"


class _TokenProvider:
    def __init__(self) -> None:
        self.calls = 0

    async def get_token(self) -> str:
        self.calls += 1
        return "mock-access-token"


def _client(
    handler: Callable[[httpx.Request], httpx.Response],
    provider: _TokenProvider,
    *,
    company_id: str | None = None,
) -> BCClient:
    return BCClient(
        tenant_id=_TENANT,
        environment="Sandbox",
        company_id=company_id,
        token_provider=provider,
        transport=httpx.MockTransport(handler),
    )


def test_reads_company_collection_with_absolute_and_relative_pagination() -> None:
    calls: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        pages = [
            {"value": [{"id": "one"}], "@odata.nextLink": f"{_API}/companies?page=2"},
            {"value": [{"id": "two"}], "@odata.nextLink": "?page=3"},
            {"value": [{"id": "three"}]},
        ]
        return httpx.Response(200, json=pages[len(calls) - 1])

    async def run() -> list[dict[str, object]]:
        async with _client(handle, _TokenProvider()) as client:
            params = httpx.QueryParams({"$top": 3})
            return [row async for row in client._iter_records("companies", params)]

    assert asyncio.run(run()) == [{"id": "one"}, {"id": "two"}, {"id": "three"}]
    assert all(request.method == "GET" for request in calls)
    assert all(
        request.headers["Authorization"] == "Bearer mock-access-token"
        for request in calls
    )
    assert calls[0].url.params["$top"] == "3"
    assert list(calls[1].url.params.multi_items()) == [("page", "2")]


def test_reads_data_for_the_configured_company() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith(f"/companies({_COMPANY})/customers")
        return httpx.Response(200, json={"value": [{"id": "customer"}]})

    async def run() -> list[dict[str, object]]:
        async with _client(handle, _TokenProvider(), company_id=_COMPANY) as client:
            return [
                row
                async for row in client._iter_records(
                    f"companies({_COMPANY})/customers"
                )
            ]

    assert asyncio.run(run()) == [{"id": "customer"}]


@pytest.mark.parametrize(
    "next_link",
    [
        f"{_API.replace('api.businesscentral.dynamics.com', 'example.invalid')}/companies",
        f"{_API.replace('https://', 'http://')}/companies",
        f"{_API.replace('/Sandbox/', '/Production/')}/companies",
        f"{_API.replace(_TENANT, _COMPANY)}/companies",
        f"{_API}/items",
        f"{_API}/companies?Company={_COMPANY}",
        f"{_API}/companies?%24expand=customers",
        f"{_API}/companies?%24count=false",
        f"{_API}/companies?%24count=1",
        f"{_API}/companies?%24count=",
        f"{_API}/companies?%24count=true&%24count=true",
        f"{_API}/companies#fragment",
        f"{_API}/companies",
    ],
)
def test_rejects_unsafe_or_repeated_next_links_before_fetching_token(
    next_link: str,
) -> None:
    provider = _TokenProvider()
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"value": [], "@odata.nextLink": next_link})

    async def run() -> None:
        async with _client(handle, provider) as client:
            with pytest.raises(BCRequestError):
                async for _ in client._iter_records("companies"):
                    pytest.fail("Unexpected record")

    asyncio.run(run())
    assert len(requests) == provider.calls == 1


def test_blocks_non_get_and_unconfigured_company_before_fetching_token() -> None:
    provider = _TokenProvider()

    def handle(_request: httpx.Request) -> httpx.Response:
        pytest.fail("Unexpected HTTP request")

    async def run() -> None:
        async with _client(handle, provider) as client:
            with pytest.raises(BCRequestError, match="only allows GET"):
                await client._request("POST", httpx.URL(f"{_API}/companies"))
            with pytest.raises(BCRequestError, match="outside the configured"):
                async for _ in client._iter_records(f"companies({_COMPANY})/customers"):
                    pytest.fail("Unexpected record")

    asyncio.run(run())
    assert provider.calls == 0


def test_rejects_non_sandbox_environment() -> None:
    with pytest.raises(BCRequestError, match="Sandbox"):
        BCClient(
            tenant_id=_TENANT, environment="Production", token_provider=_TokenProvider()
        )


@pytest.mark.parametrize(
    ("statuses", "retry_after", "expected_delays", "expected_error"),
    [
        ([429, 200], "5", [5.0], None),
        ([503, 502, 200], "invalid", [1.0, 2.0], None),
        ([429, 429, 429], "0", [0.0, 0.0], BCRateLimitError),
        ([503, 503, 503], None, [1.0, 2.0], BCServerError),
        ([429], "31", [], BCRateLimitError),
    ],
)
def test_retries_with_a_bounded_delay(
    statuses: list[int],
    retry_after: str | None,
    expected_delays: list[float],
    expected_error: type[BCError] | None,
) -> None:
    responses = iter(statuses)
    headers = {"Retry-After": retry_after} if retry_after is not None else {}

    def handle(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(next(responses), headers=headers, json={"value": []})

    async def run() -> None:
        async with _client(handle, _TokenProvider()) as client:
            assert [row async for row in client._iter_records("companies")] == []

    with patch("bc_sdk.client.asyncio.sleep", new_callable=AsyncMock) as sleep:
        if expected_error is None:
            asyncio.run(run())
        else:
            with pytest.raises(expected_error):
                asyncio.run(run())

    assert [args.args[0] for args in sleep.await_args_list] == expected_delays
    assert next(responses, None) is None


def test_retry_after_supports_http_date() -> None:
    future = format_datetime(datetime.now(UTC) + timedelta(seconds=15), usegmt=True)
    responses = iter(
        [
            httpx.Response(503, headers={"Retry-After": future}),
            httpx.Response(200, json={"value": []}),
        ]
    )

    async def run() -> None:
        async with _client(
            lambda _request: next(responses), _TokenProvider()
        ) as client:
            assert [row async for row in client._iter_records("companies")] == []

    with patch("bc_sdk.client.asyncio.sleep", new_callable=AsyncMock) as sleep:
        asyncio.run(run())

    assert sleep.await_count == 1
    assert sleep.await_args is not None
    assert 0 < sleep.await_args.args[0] <= 15


@pytest.mark.parametrize(
    ("status", "expected_error"),
    [
        (302, BCRequestError),
        (401, BCAuthError),
        (403, BCAuthError),
        (404, BCNotFoundError),
    ],
)
def test_maps_http_errors_without_following_redirect_or_exposing_body(
    status: int, expected_error: type[BCError]
) -> None:
    provider = _TokenProvider()
    calls = 0

    def handle(_request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            status, text=_DETAIL, headers={"Location": "https://example.invalid"}
        )

    async def run() -> None:
        async with _client(handle, provider) as client:
            with pytest.raises(expected_error) as error:
                async for _ in client._iter_records("companies"):
                    pytest.fail("Unexpected record")
            assert _DETAIL not in str(error.value)

    asyncio.run(run())
    assert calls == provider.calls == 1


@pytest.mark.parametrize(
    "payload",
    [
        "bad",
        {"value": [1]},
        {"value": [], "@odata.nextLink": 1},
        {"value": [], "@odata.count": "1"},
        {"value": [], "@odata.count": -1},
        {"value": [], "@odata.count": True},
    ],
)
def test_rejects_invalid_collection_shapes(payload: object) -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    async def run() -> None:
        async with _client(handle, _TokenProvider()) as client:
            with pytest.raises(BCRequestError):
                async for _ in client._iter_records("companies"):
                    pytest.fail("Unexpected record")

    asyncio.run(run())


def test_iter_pages_reads_valid_odata_count_with_count_param() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.url.params["$count"] == "true"
        return httpx.Response(200, json={"value": [{"id": "one"}], "@odata.count": 42})

    async def run() -> list[tuple[list[dict[str, object]], int | None]]:
        async with _client(handle, _TokenProvider()) as client:
            params = httpx.QueryParams({"$count": "true"})
            return [page async for page in client._iter_pages("companies", params)]

    assert asyncio.run(run()) == [([{"id": "one"}], 42)]
