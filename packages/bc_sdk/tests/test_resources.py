import asyncio
from collections.abc import Callable
from unittest.mock import patch
from uuid import UUID

import httpx
import pytest
from bc_sdk import (
    BCClient,
    BCSettings,
    Company,
    Customer,
    Item,
    RecordField,
    RecordOrder,
)
from bc_sdk.errors import BCRequestError
from pydantic import ValidationError

_TENANT = "00000000-0000-0000-0000-000000000001"
_COMPANY = "00000000-0000-0000-0000-000000000002"
_RECORD = "00000000-0000-0000-0000-000000000003"
_DETAIL = "synthetic-sensitive-detail"


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


def test_lists_typed_standard_resources_with_selected_fields() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert "$orderby" not in request.url.params
        assert "$filter" not in request.url.params
        path = request.url.path
        if path.endswith("/companies"):
            assert request.url.params["$select"] == "id,name,displayName"
            record = {"id": _COMPANY, "name": "DEMO COMPANY", "displayName": "Demo"}
        else:
            assert request.url.params["$select"] == "id,number,displayName"
            assert f"/companies({_COMPANY})/" in path
            entity = path.rsplit("/", 1)[-1]
            assert entity in {"customers", "items"}
            record = {"id": _RECORD, "number": "1", "displayName": entity}
        return httpx.Response(200, json={"value": [record]})

    async def run() -> tuple[list[Company], list[Customer], list[Item]]:
        async with _client(handle) as client:
            return (
                await client.companies.list(),
                await client.customers.list(company_id=_COMPANY),
                await client.items.list(),
            )

    companies, customers, items = asyncio.run(run())
    assert companies[0].id == UUID(_COMPANY)
    assert companies[0].display_name == "Demo"
    assert customers[0].number == "1"
    assert customers[0].display_name == "customers"
    assert items[0].display_name == "items"


@pytest.mark.parametrize("order", list(RecordOrder))
def test_company_resources_send_order_with_top(order: RecordOrder) -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.params["$orderby"] == order.value
        assert request.url.params["$top"] == "2"
        return httpx.Response(200, json={"value": []})

    async def run() -> None:
        async with _client(handle) as client:
            await client.customers.list(top=2, order_by=order)
            await client.items.list(top=2, order_by=order)

    asyncio.run(run())


def test_top_caps_total_records_without_reading_an_extra_page() -> None:
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 1:
            assert request.url.params["$top"] == "2"
            value = [{"id": _RECORD, "number": "1", "displayName": "One"}]
        else:
            assert len(requests) == 2
            value = [
                {"id": _RECORD, "number": "2", "displayName": "Two"},
                {"id": _RECORD, "number": "3", "displayName": "Three"},
            ]
        return httpx.Response(
            200, json={"value": value, "@odata.nextLink": f"?page={len(requests) + 1}"}
        )

    async def run() -> list[Item]:
        async with _client(handle) as client:
            return await client.items.list(top=2)

    assert [item.number for item in asyncio.run(run())] == ["1", "2"]
    assert len(requests) == 2


def test_number_filter_is_encoded_as_one_odata_literal() -> None:
    value = "00'A & B+#"

    def handle(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert dict(request.url.params) == {
            "$select": "id,number,displayName",
            "$top": "2",
            "$orderby": "number asc",
            "$filter": "number eq '00''A & B+#'",
        }
        return httpx.Response(200, json={"value": []})

    async def run() -> None:
        async with _client(handle) as client:
            await client.customers.list(
                top=2, order_by=RecordOrder.NUMBER_ASC, number=value
            )
            await client.items.list(
                top=2, order_by=RecordOrder.NUMBER_ASC, number=value
            )

    asyncio.run(run())


def test_rejects_invalid_scope_and_top_before_sending_a_request() -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        pytest.fail("Unexpected request")

    async def run() -> None:
        async with _client(handle) as client:
            with pytest.raises(BCRequestError, match="outside the configured scope"):
                await client.customers.list(company_id=_RECORD)
            with pytest.raises(BCRequestError, match="must be a UUID"):
                await client.items.list(company_id="invalid")
            with pytest.raises(BCRequestError, match="positive integer"):
                await client.companies.list(top=0)
            with pytest.raises(BCRequestError, match="Unsupported record order"):
                await client.items.list(order_by="number asc,id desc")  # type: ignore[arg-type]
            with pytest.raises(BCRequestError, match="Invalid record number"):
                await client.items.list(number="X" * 101)
            with pytest.raises(BCRequestError, match="Unsupported record fields"):
                await client.customers.list(fields=[])
            with pytest.raises(BCRequestError, match="Unsupported record fields"):
                await client.customers.list(fields=[RecordField.ID, RecordField.ID])
            with pytest.raises(BCRequestError, match="Unsupported record fields"):
                await client.items.list(fields=["city"])  # type: ignore[list-item]
        async with _client(handle, company_id=None) as client:
            with pytest.raises(BCRequestError, match="Configure the demo company"):
                await client.items.list(company_id=_COMPANY)

    asyncio.run(run())


def test_company_resources_select_requested_fields() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.url.params["$select"] == "number,displayName"
        return httpx.Response(
            200, json={"value": [{"number": "1", "displayName": "A"}]}
        )

    async def run() -> list[Customer]:
        async with _client(handle) as client:
            return await client.customers.list(
                fields=[RecordField.NUMBER, RecordField.DISPLAY_NAME]
            )

    rows = asyncio.run(run())
    assert len(rows) == 1
    assert rows[0].id is None
    assert rows[0].number == "1"
    assert rows[0].display_name == "A"


def test_company_discovery_works_without_company_id() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/companies")
        return httpx.Response(200, json={"value": []})

    async def run() -> list[Company]:
        async with _client(handle, company_id=None) as client:
            return await client.companies.list()

    assert asyncio.run(run()) == []


def test_invalid_response_does_not_expose_record_contents() -> None:
    def handle(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"value": [{"id": _DETAIL}]})

    async def run() -> None:
        async with _client(handle) as client:
            with pytest.raises(BCRequestError) as error:
                await client.items.list()
            assert _DETAIL not in str(error.value)

    asyncio.run(run())


def test_settings_factory_creates_msal_provider_without_authenticating() -> None:
    settings = BCSettings.model_validate(
        {"tenant_id": _TENANT, "client_id": _RECORD, "client_secret": _DETAIL}
    )

    async def run() -> None:
        async with BCClient.from_settings(settings) as client:
            assert callable(client.companies.list)

    with patch("bc_sdk.client.MsalTokenProvider") as provider:
        asyncio.run(run())

    provider.assert_called_once_with(
        tenant_id=_TENANT, client_id=_RECORD, client_secret=_DETAIL
    )
    provider.return_value.get_token.assert_not_called()
    assert _DETAIL not in repr(settings)
    assert _DETAIL not in settings.model_dump_json()


def test_settings_validation_hides_sensitive_input() -> None:
    with pytest.raises(ValidationError) as error:
        BCSettings.model_validate(
            {"tenant_id": _DETAIL, "client_id": _RECORD, "client_secret": ""}
        )

    assert _DETAIL not in str(error.value)
