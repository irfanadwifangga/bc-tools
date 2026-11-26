from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from bc_sdk.errors import (
    BCAuthError,
    BCNotFoundError,
    BCRateLimitError,
    BCServerError,
)
from fastapi.testclient import TestClient

from backend.app.main import app

_BASE = "/api/v1/permission-analyzer"
_FACTORY = "backend.app.core.bc.BCClient.from_settings"
_COMPANY_ID = str(UUID(int=99))
_USER_1 = "11111111-1111-1111-1111-111111111111"
_USER_2 = "22222222-2222-2222-2222-222222222222"
_APP_USER = "33333333-3333-3333-3333-333333333333"
_APP_ID = "44444444-4444-4444-4444-444444444444"
_ZERO_GUID = "00000000-0000-0000-0000-000000000000"


@pytest.fixture
def sandbox_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BC_TENANT_ID", "00000000-0000-0000-0000-000000000001")
    monkeypatch.setenv("BC_CLIENT_ID", "00000000-0000-0000-0000-000000000002")
    monkeypatch.setenv("BC_CLIENT_SECRET", "fixture")
    monkeypatch.setenv("BC_ENVIRONMENT", "Sandbox")
    monkeypatch.setenv("BC_COMPANY_ID", _COMPANY_ID)


def _sample_users_permissions() -> list[dict[str, object]]:
    return [
        {
            "userSecurityId": _USER_1,
            "userName": "ALICE",
            "fullName": "Alice Demo",
            "state": "Enabled",
            "licenseType": "Full User",
            "applicationId": _ZERO_GUID,
        },
        {
            "userSecurityId": _USER_2,
            "userName": "BOB",
            "fullName": "Bob Demo",
            "state": "Enabled",
            "licenseType": "Limited User",
            "applicationId": "",
        },
        {
            "userSecurityId": _APP_USER,
            "userName": "INTEGRATION-BOT",
            "fullName": "Integration App",
            "state": "Enabled",
            "licenseType": "Application",
            "applicationId": _APP_ID,
        },
    ]


def _sample_user_permission_sets() -> list[dict[str, object]]:
    return [
        {
            "userSecurityId": _USER_1.upper(),
            "roleId": "SUPER",
            "roleName": "Super User",
            "company": "",
            "scope": "System",
            "type": "Direct",
            "securityGroupCode": "",
            "appId": _ZERO_GUID,
            "appName": "System",
        },
        {
            "userSecurityId": _USER_2,
            "roleId": "D365 READ",
            "roleName": "Dynamics 365 Read",
            "company": "CRONUS",
            "scope": "System",
            "type": "Security Group",
            "securityGroupCode": "SG-READ",
            "appId": _ZERO_GUID,
            "appName": "Base Application",
        },
        {
            "userSecurityId": _APP_USER,
            "roleId": "D365 AUTOMATION",
            "roleName": "Automation API",
            "company": "DEMO",
            "scope": "System",
            "type": "Direct",
            "securityGroupCode": "",
            "appId": _ZERO_GUID,
            "appName": "Base Application",
        },
    ]


def _sample_permission_sets() -> list[dict[str, object]]:
    return [
        {
            "id": "SUPER",
            "displayName": "Super User",
            "scope": "System",
            "appId": _ZERO_GUID,
            "extensionName": "System",
        },
        {
            "id": "D365 READ",
            "displayName": "Dynamics 365 Read",
            "scope": "System",
            "appId": _ZERO_GUID,
            "extensionName": "Base Application",
        },
        {
            "id": "D365 AUTOMATION",
            "displayName": "Automation API",
            "scope": "System",
            "appId": _ZERO_GUID,
            "extensionName": "Base Application",
        },
    ]


def _sample_expanded_permission_sets() -> list[dict[str, object]]:
    return [
        {
            "roleId": "SUPER",
            "roleName": "Super User",
            "scope": "System",
            "appId": _ZERO_GUID,
            "appName": "System",
            "objectType": "TableData",
            "objectId": 0,
            "objectName": "All Tables",
            "alObjectName": "",
            "readPermission": "Yes",
            "insertPermission": "None",
            "modifyPermission": "None",
            "deletePermission": "None",
            "executePermission": "None",
        },
        {
            "roleId": "D365 READ",
            "roleName": "Dynamics 365 Read",
            "scope": "System",
            "appId": _ZERO_GUID,
            "appName": "Base Application",
            "objectType": "TableData",
            "objectId": 18,
            "objectName": "Customer",
            "alObjectName": "Customer",
            "readPermission": "Yes",
            "insertPermission": "None",
            "modifyPermission": "None",
            "deletePermission": "None",
            "executePermission": "None",
        },
        {
            "roleId": "D365 AUTOMATION",
            "roleName": "Automation API",
            "scope": "System",
            "appId": _ZERO_GUID,
            "appName": "Base Application",
            "objectType": "TableData",
            "objectId": 18,
            "objectName": "Customer",
            "alObjectName": "Customer",
            "readPermission": "Yes",
            "insertPermission": "Yes",
            "modifyPermission": "Indirect",
            "deletePermission": "None",
            "executePermission": "None",
        },
        {
            "roleId": "D365 AUTOMATION",
            "roleName": "Automation API",
            "scope": "System",
            "appId": _ZERO_GUID,
            "appName": "Base Application",
            "objectType": "Codeunit",
            "objectId": 50100,
            "objectName": "Demo Helper",
            "alObjectName": "Demo Helper",
            "readPermission": "None",
            "insertPermission": "None",
            "modifyPermission": "None",
            "deletePermission": "None",
            "executePermission": "Yes",
        },
    ]


def test_users_endpoint_joins_normalizes_and_detects_super(
    sandbox_config: None,
) -> None:
    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        assert company_scoped is True
        mapping = {
            "usersPermissions": _sample_users_permissions(),
            "userPermissionSets": _sample_user_permission_sets(),
            "permissionSets": _sample_permission_sets(),
        }
        return mapping[entity]

    with patch(_FACTORY) as factory, TestClient(app) as http:
        client = factory.return_value
        client.automation.list_records = AsyncMock(side_effect=list_records)
        response = http.get(f"{_BASE}/users")
        client.__aexit__.assert_awaited_once()

    assert response.status_code == 200
    data = response.json()
    assert data["companies"] == ["CRONUS", "DEMO"]
    assert [ps["id"] for ps in data["permissionSets"]] == [
        "D365 AUTOMATION",
        "D365 READ",
        "SUPER",
    ]
    users_by_name = {u["userName"]: u for u in data["users"]}
    assert users_by_name["ALICE"]["principalType"] == "user"
    assert users_by_name["ALICE"]["applicationId"] is None
    assert users_by_name["ALICE"]["isSuper"] is True
    assert users_by_name["ALICE"]["assignments"][0]["roleId"] == "SUPER"

    assert users_by_name["BOB"]["principalType"] == "user"
    assert users_by_name["BOB"]["isSuper"] is False
    assert users_by_name["BOB"]["assignments"][0]["securityGroupCode"] == "SG-READ"

    assert users_by_name["INTEGRATION-BOT"]["principalType"] == "application"
    assert users_by_name["INTEGRATION-BOT"]["applicationId"] == _APP_ID
    assert users_by_name["INTEGRATION-BOT"]["isSuper"] is False


def test_users_detects_entra_app_by_license_type_without_guid(
    sandbox_config: None,
) -> None:
    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        if entity == "usersPermissions":
            return [
                {
                    "userSecurityId": _APP_USER,
                    "userName": "APP-NO-GUID",
                    "fullName": "App License Only",
                    "state": "Enabled",
                    "licenseType": "Application",
                    "applicationId": _ZERO_GUID,
                }
            ]
        return []

    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=list_records
        )
        response = http.get(f"{_BASE}/users")

    assert response.status_code == 200
    user = response.json()["users"][0]
    assert user["principalType"] == "application"
    assert user["applicationId"] is None


def test_objects_search_filters_company_access_and_sensitivity(
    sandbox_config: None,
) -> None:
    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        assert company_scoped is True
        mapping = {
            "expandedPermissionSets": _sample_expanded_permission_sets(),
            "userPermissionSets": _sample_user_permission_sets(),
            "usersPermissions": _sample_users_permissions(),
        }
        return mapping[entity]

    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=list_records
        )
        all_cust = http.get(f"{_BASE}/objects", params={"query": "18"})
        write_cust = http.get(
            f"{_BASE}/objects",
            params={"query": "Customer", "object_type": "TableData", "access": "write"},
        )
        cronus_cust = http.get(
            f"{_BASE}/objects",
            params={"query": "Customer", "company": "CRONUS"},
        )
        exec_codeunit = http.get(
            f"{_BASE}/objects",
            params={
                "query": "Demo Helper",
                "object_type": "Codeunit",
                "access": "execute",
            },
        )
        super_search = http.get(f"{_BASE}/objects", params={"query": "All Tables"})

    assert all_cust.status_code == 200
    assert all_cust.json()["totalMatches"] == 2
    assert all_cust.json()["truncated"] is False
    by_role = {m["roleId"]: m for m in all_cust.json()["matches"]}
    assert by_role["D365 READ"]["isSensitive"] is False
    assert by_role["D365 READ"]["holders"][0]["userName"] == "BOB"
    assert by_role["D365 AUTOMATION"]["isSensitive"] is True
    assert by_role["D365 AUTOMATION"]["holders"][0]["principalType"] == "application"

    assert write_cust.status_code == 200
    assert [m["roleId"] for m in write_cust.json()["matches"]] == ["D365 AUTOMATION"]

    assert cronus_cust.status_code == 200
    assert [m["roleId"] for m in cronus_cust.json()["matches"]] == ["D365 READ"]

    assert exec_codeunit.status_code == 200
    assert exec_codeunit.json()["matches"][0]["isSensitive"] is False
    assert exec_codeunit.json()["matches"][0]["executePermission"] == "Yes"

    assert super_search.status_code == 200
    assert super_search.json()["matches"][0]["isSensitive"] is True


def test_objects_search_caps_results_at_200(sandbox_config: None) -> None:
    expanded = [
        {
            "roleId": "D365 READ",
            "objectType": "TableData",
            "objectId": idx,
            "objectName": f"Table {idx}",
            "readPermission": "Yes",
        }
        for idx in range(1, 226)
    ]

    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        if entity == "expandedPermissionSets":
            return expanded
        return []

    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=list_records
        )
        response = http.get(f"{_BASE}/objects", params={"query": "Table"})

    assert response.status_code == 200
    body = response.json()
    assert body["totalMatches"] == 225
    assert body["truncated"] is True
    assert len(body["matches"]) == 200


def test_diff_user_aggregates_roles_and_objects(sandbox_config: None) -> None:
    extra_user_sets = _sample_user_permission_sets() + [
        {
            "userSecurityId": _APP_USER,
            "roleId": "D365 READ",
            "roleName": "Dynamics 365 Read",
            "company": "CRONUS",
            "scope": "System",
            "type": "Direct",
            "securityGroupCode": "",
            "appId": _ZERO_GUID,
        }
    ]

    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        mapping = {
            "usersPermissions": _sample_users_permissions(),
            "userPermissionSets": extra_user_sets,
            "expandedPermissionSets": _sample_expanded_permission_sets(),
        }
        return mapping[entity]

    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=list_records
        )
        response = http.get(
            f"{_BASE}/diff",
            params={"kind": "user", "left": _USER_2, "right": _APP_USER},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["kind"] == "user"
    assert data["leftLabel"] == "Bob Demo (BOB)"
    assert data["rightLabel"] == "Integration App (INTEGRATION-BOT)"
    assert [r["roleId"] for r in data["roleDiff"]["same"]] == ["D365 READ"]
    assert data["roleDiff"]["onlyLeft"] == []
    assert [r["roleId"] for r in data["roleDiff"]["onlyRight"]] == ["D365 AUTOMATION"]

    # Customer (18) differs (Read-only vs Read+Insert+Indirect Modify) -> in onlyLeft & onlyRight
    assert [o["objectId"] for o in data["objectDiff"]["onlyLeft"]] == [18]
    assert [o["objectId"] for o in data["objectDiff"]["onlyRight"]] == [50100, 18]
    assert data["objectDiff"]["same"] == []


def test_diff_role_compares_permission_sets_and_handles_not_found(
    sandbox_config: None,
) -> None:
    async def list_records(
        entity: str, *, company_scoped: bool = True
    ) -> list[dict[str, object]]:
        mapping = {
            "permissionSets": _sample_permission_sets(),
            "expandedPermissionSets": _sample_expanded_permission_sets(),
        }
        return mapping[entity]

    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=list_records
        )
        ok = http.get(
            f"{_BASE}/diff",
            params={"kind": "role", "left": "D365 READ", "right": "D365 AUTOMATION"},
        )
        missing = http.get(
            f"{_BASE}/diff",
            params={"kind": "role", "left": "D365 READ", "right": "UNKNOWN_ROLE"},
        )

    assert ok.status_code == 200
    diff = ok.json()
    assert diff["leftLabel"] == "Dynamics 365 Read (D365 READ)"
    assert diff["rightLabel"] == "Automation API (D365 AUTOMATION)"
    assert [o["objectId"] for o in diff["objectDiff"]["onlyLeft"]] == [18]
    assert [o["objectId"] for o in diff["objectDiff"]["onlyRight"]] == [50100, 18]

    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "BC_NOT_FOUND"


def test_endpoints_reject_invalid_queries_and_writes_before_sdk_creation() -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        assert http.get(f"{_BASE}/users", params={"extra": "1"}).status_code == 422
        assert http.post(f"{_BASE}/users").status_code == 405

        for bad_obj in (
            {},
            {"query": ""},
            {"query": "   "},
            {"query": "X" * 81},
            {"query": "Cust\nomer"},
            {"query": "Customer", "unknown": "1"},
            {"query": "Customer", "object_type": "Invalid"},
            {"query": "Customer", "object_type": ""},
            {"query": "Customer", "access": "admin"},
            {"query": "Customer", "company": ""},
            [("query", "A"), ("query", "B")],
        ):
            res = http.get(f"{_BASE}/objects", params=bad_obj)
            assert res.status_code == 422
            assert res.json()["error"]["code"] == "INVALID_QUERY"
        assert http.post(f"{_BASE}/objects").status_code == 405

        for bad_diff in (
            {},
            {"kind": "group", "left": "a", "right": "b"},
            {"kind": "user", "left": "", "right": "b"},
            {"kind": "user", "left": "a", "right": "   "},
            {"kind": "user", "left": "a", "right": "b", "extra": "1"},
            [("kind", "user"), ("kind", "role"), ("left", "a"), ("right", "b")],
        ):
            res = http.get(f"{_BASE}/diff", params=bad_diff)
            assert res.status_code == 422
            assert res.json()["error"]["code"] == "INVALID_QUERY"
        assert http.post(f"{_BASE}/diff").status_code == 405

        factory.assert_not_called()


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (BCAuthError, 502, "BC_AUTH_ERROR"),
        (BCNotFoundError, 404, "BC_NOT_FOUND"),
        (BCRateLimitError, 429, "BC_RATE_LIMITED"),
        (BCServerError, 502, "BC_UPSTREAM_ERROR"),
    ],
)
def test_permission_analyzer_translates_sdk_errors(
    sandbox_config: None, error: type[Exception], status: int, code: str
) -> None:
    with patch(_FACTORY) as factory, TestClient(app) as http:
        factory.return_value.automation.list_records = AsyncMock(
            side_effect=error("private-secret-detail")
        )
        res = http.get(f"{_BASE}/users")
        factory.return_value.__aexit__.assert_awaited_once()

    assert res.status_code == status
    body = res.json()["error"]
    assert body["code"] == code
    assert "private-secret-detail" not in res.text


def test_permission_analyzer_requires_company_config(
    sandbox_config: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("BC_COMPANY_ID")
    with patch(_FACTORY) as factory, TestClient(app) as http:
        res = http.get(f"{_BASE}/users")
        factory.assert_not_called()
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "BC_CONFIG_ERROR"
