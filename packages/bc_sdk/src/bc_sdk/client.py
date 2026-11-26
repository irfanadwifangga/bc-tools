import asyncio
import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from types import TracebackType
from typing import Self
from uuid import UUID

import httpx

from .auth import MsalTokenProvider, TokenProvider
from .errors import (
    BCAuthError,
    BCNotFoundError,
    BCRateLimitError,
    BCRequestError,
    BCServerError,
)
from .metadata import Metadata
from .models import Customer, Item
from .resources import Companies, CompanyResource
from .settings import BCSettings

_BC_HOST = "api.businesscentral.dynamics.com"
_ENTITY_NAME = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_CUSTOM_API_ROUTE = re.compile(r"[A-Za-z0-9]+/[A-Za-z0-9]+/(?:v[0-9]+\.[0-9]+|beta)")
_MAX_ATTEMPTS = 3
_MAX_RETRY_DELAY = 30


def _retry_delay(header: str | None, attempt: int) -> float:
    if header is None:
        return float(2**attempt)
    value = header.strip()
    if value.isascii() and value.isdecimal():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (ValueError, OverflowError):
        return float(2**attempt)
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    return max(0.0, (when - datetime.now(UTC)).total_seconds())


class BCClient:
    """Read-only HTTP client for the standard API and configured custom metadata."""

    def __init__(
        self,
        *,
        tenant_id: str,
        environment: str,
        token_provider: TokenProvider,
        company_id: str | None = None,
        custom_api_route: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if environment.casefold() != "sandbox":
            raise BCRequestError("Only the Business Central Sandbox is supported.")
        try:
            tenant = UUID(tenant_id)
            company = UUID(company_id) if company_id is not None else None
        except ValueError:
            raise BCRequestError("Tenant and company IDs must be UUIDs.") from None

        if custom_api_route is not None and (
            not _CUSTOM_API_ROUTE.fullmatch(custom_api_route)
            or custom_api_route.split("/", 1)[0].casefold() == "microsoft"
        ):
            raise BCRequestError("Invalid custom API route.")

        api_path = f"/v2.0/{tenant}/Sandbox/api/"
        self._base_path = f"{api_path}v2.0/"
        self._custom_metadata_path = (
            f"{api_path}{custom_api_route}/$metadata"
            if custom_api_route is not None
            else None
        )
        self._company_path = f"companies({company})/" if company is not None else None
        self._token_provider = token_provider
        self._http = httpx.AsyncClient(
            timeout=10.0, follow_redirects=False, trust_env=False, transport=transport
        )
        self.metadata = Metadata(self._read_metadata)
        self.custom_metadata = Metadata(self._read_custom_metadata)
        self.companies = Companies(self._iter_records)
        self.customers = CompanyResource(
            self._iter_records, company, "customers", Customer
        )
        self.items = CompanyResource(self._iter_records, company, "items", Item)

    @classmethod
    def from_settings(cls, settings: BCSettings) -> Self:
        """Construct a Sandbox client with app-only authentication."""
        tenant_id = str(settings.tenant_id)
        return cls(
            tenant_id=tenant_id,
            environment=settings.environment,
            company_id=str(settings.company_id)
            if settings.company_id is not None
            else None,
            custom_api_route=settings.custom_api_route,
            token_provider=MsalTokenProvider(
                tenant_id=tenant_id,
                client_id=str(settings.client_id),
                client_secret=settings.client_secret.get_secret_value(),
            ),
        )

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        _exc_type: type[BaseException] | None,
        _exc: BaseException | None,
        _traceback: TracebackType | None,
    ) -> None:
        await self._http.aclose()

    def _path_allowed(self, path: str) -> bool:
        if path in {"companies", "$metadata"}:
            return True
        if self._company_path is None or not path.startswith(self._company_path):
            return False
        return _ENTITY_NAME.fullmatch(path[len(self._company_path) :]) is not None

    def _initial_url(self, path: str, params: httpx.QueryParams | None) -> httpx.URL:
        if not self._path_allowed(path):
            raise BCRequestError(
                "The API path is outside the configured Sandbox scope."
            )
        url = httpx.URL(f"https://{_BC_HOST}{self._base_path}{path}")
        return url.copy_merge_params(params) if params is not None else url

    def _validate_url(self, url: httpx.URL) -> None:
        if (
            url.scheme != "https"
            or url.host != _BC_HOST
            or url.port not in (None, 443)
            or url.username
            or url.password
            or url.fragment
        ):
            raise BCRequestError("The API destination is outside the Sandbox scope.")

        path = url.raw_path.partition(b"?")[0].decode("ascii")
        if path == self._custom_metadata_path:
            if url.query:
                raise BCRequestError(
                    "The metadata endpoint does not accept query options."
                )
            return
        if not path.startswith(self._base_path) or not self._path_allowed(
            path[len(self._base_path) :]
        ):
            raise BCRequestError(
                "The API path is outside the configured Sandbox scope."
            )

        if path == f"{self._base_path}$metadata" and url.query:
            raise BCRequestError("The metadata endpoint does not accept query options.")

        for key in url.params:
            if key.casefold() == "company" or (
                path == f"{self._base_path}companies" and key.casefold() == "$expand"
            ):
                raise BCRequestError("The API query is outside the configured scope.")

    async def _request(self, method: str, url: httpx.URL) -> httpx.Response:
        if method != "GET":
            raise BCRequestError("The Business Central client only allows GET.")
        self._validate_url(url)
        token = await self._token_provider.get_token()
        for attempt in range(_MAX_ATTEMPTS):
            try:
                response = await self._http.request(
                    method, url, headers={"Authorization": f"Bearer {token}"}
                )
            except httpx.RequestError:
                raise BCServerError("The Business Central request failed.") from None
            if not (response.status_code == 429 or response.is_server_error):
                return response
            if attempt == _MAX_ATTEMPTS - 1:
                break
            delay = _retry_delay(response.headers.get("Retry-After"), attempt)
            if delay > _MAX_RETRY_DELAY:
                break
            await asyncio.sleep(delay)
        return response

    async def _get(self, url: httpx.URL) -> httpx.Response:
        response = await self._request("GET", url)
        if not response.is_success:
            match response.status_code:
                case 401 | 403:
                    raise BCAuthError(
                        "Business Central rejected the credentials or access."
                    )
                case 404:
                    raise BCNotFoundError(
                        "The Business Central resource was not found."
                    )
                case 429:
                    raise BCRateLimitError("Business Central throttled the request.")
            if response.is_server_error:
                raise BCServerError("Business Central returned a server error.")
            raise BCRequestError(
                f"Business Central returned an unexpected HTTP status ({response.status_code})."
            )

        return response

    async def _read_metadata(self) -> bytes:
        response = await self._get(self._initial_url("$metadata", None))
        return response.content

    async def _read_custom_metadata(self) -> bytes:
        if self._custom_metadata_path is None:
            raise BCRequestError(
                "Configure a custom API route before reading metadata."
            )
        url = httpx.URL(f"https://{_BC_HOST}{self._custom_metadata_path}")
        return (await self._get(url)).content

    async def _read_json(self, url: httpx.URL) -> dict[str, object]:
        response = await self._get(url)
        try:
            body = response.json()
        except ValueError:
            raise BCRequestError(
                "Business Central did not return valid JSON."
            ) from None
        if not isinstance(body, dict):
            raise BCRequestError("Business Central did not return a JSON object.")
        return body

    async def _iter_records(
        self, path: str, params: httpx.QueryParams | None = None
    ) -> AsyncIterator[dict[str, object]]:
        current = self._initial_url(path, params)
        original_path = current.raw_path.partition(b"?")[0]
        visited: set[httpx.URL] = set()
        while True:
            if current in visited:
                raise BCRequestError("Business Central repeated a pagination link.")
            visited.add(current)
            payload = await self._read_json(current)
            records = payload.get("value")
            if not isinstance(records, list) or not all(
                isinstance(record, dict) for record in records
            ):
                raise BCRequestError("Business Central returned an invalid collection.")
            for record in records:
                yield record

            next_link = payload.get("@odata.nextLink")
            if next_link is None:
                return
            if not isinstance(next_link, str) or not next_link.strip():
                raise BCRequestError(
                    "Business Central returned an invalid pagination link."
                )
            try:
                current = current.join(next_link)
            except httpx.InvalidURL:
                raise BCRequestError(
                    "Business Central returned an invalid pagination link."
                ) from None
            if current.raw_path.partition(b"?")[0] != original_path:
                raise BCRequestError("The pagination link changed the API endpoint.")
