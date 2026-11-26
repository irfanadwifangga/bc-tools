import asyncio
import os
import time

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
        async with BCClient.from_settings(settings, timeout=45.0) as client:
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
                "aggregatePermissionSets",
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
            controls = await client.automation.list_records("accessControls", top=1)
            assert isinstance(controls, list)
            if controls:
                print("Sample accessControl keys:", sorted(controls[0].keys()))
            for entity_name in (
                "usersPermissions",
                "accessControls",
                "permissionSets",
            ):
                rows = await client.automation.list_records(
                    entity_name, company_scoped=True
                )
                print(f"Full-read {entity_name}: ok, count={len(rows)}")
            for label, entity_name, top_val, filter_val in (
                ("aggregate top=1", "aggregatePermissionSets", 1, None),
                ("expanded top=5", "expandedPermissionSets", 5, None),
                (
                    "expanded role=D365 READ",
                    "expandedPermissionSets",
                    None,
                    "roleId eq 'D365 READ'",
                ),
                (
                    "expanded objectId=18 top=20",
                    "expandedPermissionSets",
                    20,
                    "objectId eq 18",
                ),
            ):
                started = time.perf_counter()
                try:
                    rows = await client.automation.list_records(
                        entity_name,
                        company_scoped=True,
                        top=top_val,
                        filter_expr=filter_val,
                    )
                    elapsed = time.perf_counter() - started
                    keys = sorted(rows[0].keys()) if rows else []
                    print(
                        f"Probe {label}: ok in {elapsed:.2f}s, count={len(rows)}, keys={keys}"
                    )
                except BCError as probe_err:
                    elapsed = time.perf_counter() - started
                    print(
                        f"Probe {label}: ERR in {elapsed:.2f}s ({type(probe_err).__name__}: {probe_err})"
                    )

    try:
        asyncio.run(check())
    except BCError as error:
        pytest.fail(
            f"Sandbox Automation API GET failed ({type(error).__name__}).",
            pytrace=False,
        )
