import asyncio
import logging
import traceback
from unittest.mock import patch

import pytest
from bc_sdk.auth import MsalTokenProvider, TokenProvider
from bc_sdk.errors import BCAuthError

_TENANT = "00000000-0000-0000-0000-000000000001"
_CLIENT = "00000000-0000-0000-0000-000000000002"
_SCOPE = "https://api.businesscentral.dynamics.com/.default"
_SENSITIVE_DETAIL = "synthetic-sensitive-detail"


def _provider() -> MsalTokenProvider:
    return MsalTokenProvider(
        tenant_id=_TENANT, client_id=_CLIENT, client_secret="unit-test"
    )


def test_get_token_reuses_msal_application() -> None:
    with patch("bc_sdk.auth.ConfidentialClientApplication") as factory:
        acquire = factory.return_value.acquire_token_for_client
        acquire.return_value = {"access_token": "mock-access-token"}
        provider: TokenProvider = _provider()

        assert asyncio.run(provider.get_token()) == "mock-access-token"
        assert asyncio.run(provider.get_token()) == "mock-access-token"

    factory.assert_called_once_with(
        _CLIENT,
        authority=f"https://login.microsoftonline.com/{_TENANT}",
        client_credential="unit-test",
        timeout=10,
        enable_pii_log=False,
    )
    acquire.assert_called_with(scopes=[_SCOPE])
    assert acquire.call_count == 2


@pytest.mark.parametrize("token", [None, "", " ", 123])
def test_get_token_rejects_invalid_response(
    token: str | int | None, caplog: pytest.LogCaptureFixture
) -> None:
    with patch("bc_sdk.auth.ConfidentialClientApplication") as factory:
        factory.return_value.acquire_token_for_client.return_value = {
            "access_token": token,
            "error_description": _SENSITIVE_DETAIL,
        }
        with caplog.at_level(logging.DEBUG), pytest.raises(BCAuthError) as error:
            asyncio.run(_provider().get_token())

    assert str(error.value) == "Microsoft Entra did not return an access token."
    assert _SENSITIVE_DETAIL not in caplog.text


@pytest.mark.parametrize("fails_at_creation", [True, False])
def test_get_token_redacts_provider_exception(
    fails_at_creation: bool, caplog: pytest.LogCaptureFixture
) -> None:
    with patch("bc_sdk.auth.ConfidentialClientApplication") as factory:
        failure = RuntimeError(_SENSITIVE_DETAIL)
        if fails_at_creation:
            factory.side_effect = failure
        else:
            factory.return_value.acquire_token_for_client.side_effect = failure
        with caplog.at_level(logging.DEBUG), pytest.raises(BCAuthError) as error:
            asyncio.run(_provider().get_token())

    assert str(error.value) == "Microsoft Entra token request failed."
    assert _SENSITIVE_DETAIL not in "".join(traceback.format_exception(error.value))
    assert _SENSITIVE_DETAIL not in caplog.text


def test_invalid_tenant_cannot_change_authority() -> None:
    with (
        patch("bc_sdk.auth.ConfidentialClientApplication") as factory,
        pytest.raises(BCAuthError, match="tenant ID must be a UUID"),
    ):
        MsalTokenProvider(
            tenant_id="../unexpected", client_id=_CLIENT, client_secret="unit-test"
        )

    factory.assert_not_called()
