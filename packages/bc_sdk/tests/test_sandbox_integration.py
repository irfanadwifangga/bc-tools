import asyncio
import os

import pytest
from bc_sdk import BCClient, BCSettings
from bc_sdk.errors import BCError
from pydantic import ValidationError


@pytest.mark.integration
def test_sandbox_read_only_resources() -> None:
    try:
        settings = BCSettings.model_validate(
            {
                "tenant_id": os.getenv("BC_TENANT_ID"),
                "client_id": os.getenv("BC_CLIENT_ID"),
                "client_secret": os.getenv("BC_CLIENT_SECRET"),
                "environment": os.getenv("BC_ENVIRONMENT", "Sandbox"),
                "company_id": os.getenv("BC_COMPANY_ID"),
            }
        )
    except ValidationError:
        pytest.fail(
            "Sandbox configuration is missing or invalid. See the runbook.",
            pytrace=False,
        )

    if settings.company_id is None:
        pytest.fail(
            "Set BC_COMPANY_ID for DEMO COMPANY before running this test.",
            pytrace=False,
        )

    async def check() -> None:
        async with BCClient.from_settings(settings) as client:
            companies = await client.companies.list()
            if not any(
                company.id == settings.company_id
                and company.name.casefold() == "demo company"
                for company in companies
            ):
                pytest.fail(
                    "BC_COMPANY_ID does not identify DEMO COMPANY.", pytrace=False
                )
            await client.customers.list(top=1)
            await client.items.list(top=1)

    try:
        asyncio.run(check())
    except BCError as error:
        pytest.fail(f"Sandbox GET failed ({type(error).__name__}).", pytrace=False)
