import asyncio
from threading import Lock
from typing import Protocol, cast
from uuid import UUID

from msal import ConfidentialClientApplication  # type: ignore[import-untyped]

from .errors import BCAuthError

_BC_SCOPE = "https://api.businesscentral.dynamics.com/.default"


class TokenProvider(Protocol):
    """Provide an access token for Business Central read requests."""

    async def get_token(self) -> str: ...


class _MsalApplication(Protocol):
    def acquire_token_for_client(self, scopes: list[str]) -> dict[str, object]: ...


class MsalTokenProvider:
    """Acquire app-only tokens using MSAL's in-memory cache."""

    def __init__(self, *, tenant_id: str, client_id: str, client_secret: str) -> None:
        try:
            tenant = UUID(tenant_id)
        except ValueError:
            raise BCAuthError("Microsoft Entra tenant ID must be a UUID.") from None

        self._authority = f"https://login.microsoftonline.com/{tenant}"
        self._client_id = client_id
        self._client_secret = client_secret
        self._app: _MsalApplication | None = None
        self._lock = Lock()

    async def get_token(self) -> str:
        return await asyncio.to_thread(self._get_token)

    def _get_token(self) -> str:
        try:
            with self._lock:
                if self._app is None:
                    self._app = cast(
                        "_MsalApplication",
                        ConfidentialClientApplication(
                            self._client_id,
                            authority=self._authority,
                            client_credential=self._client_secret,
                            timeout=10,
                            enable_pii_log=False,
                        ),
                    )
                result = self._app.acquire_token_for_client(scopes=[_BC_SCOPE])
                token = result.get("access_token")
        except Exception:  # noqa: BLE001
            # Provider exceptions can contain sensitive authentication details.
            raise BCAuthError("Microsoft Entra token request failed.") from None

        if not isinstance(token, str) or not token.strip():
            raise BCAuthError("Microsoft Entra did not return an access token.")
        return token
