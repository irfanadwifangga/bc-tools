import asyncio
import os

import pytest
from bc_sdk import BCClient, BCSettings
from bc_sdk.errors import BCError
from pydantic import ValidationError


@pytest.mark.integration
def test_sandbox_automation_permission_discovery() -> None:
    """Manual read-only check for Automation API metadata and permission sets in Sandbox."""
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
            entities = await client.automation.list_metadata()
            assert any(entity.name == "permissionSets" for entity in entities)
            sets = await client.automation.list_records("permissionSets", top=3)
            assert isinstance(sets, list)
            print("Automation entities:", [entity.name for entity in entities])
            target = {
                "users",
                "permissionSets",
                "userPermissionSets",
                "expandedPermissionSets",
                "accessControls",
                "usersPermissions",
                "userPermissions",
            }
            for entity in entities:
                if entity.name in target:
                    fields = [f"{field.name}:{field.type}" for field in entity.fields]
                    print(f"Schema {entity.name}:", fields)
            if sets:
                print("Sample permissionSet keys:", sorted(sets[0].keys()))

    try:
        asyncio.run(check())
    except BCError as error:
        pytest.fail(
            f"Sandbox Automation API GET failed ({type(error).__name__}).",
            pytrace=False,
        )
