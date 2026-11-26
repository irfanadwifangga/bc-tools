"""Deterministic join, sensitivity classification, search, and diff for BC permissions."""

import asyncio
from dataclasses import dataclass
from typing import Literal

from bc_sdk import BCClient
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

MAX_OBJECT_QUERY_LENGTH = 80
MAX_OBJECT_MATCHES = 200
OBJECT_TYPES = ("TableData", "Table", "Page", "Report", "Codeunit")
ACCESS_FILTERS = ("any", "write", "read", "insert", "modify", "delete", "execute")
DIFF_KINDS = ("user", "role")

_ZERO_GUID = "00000000-0000-0000-0000-000000000000"
_APP_LICENSE_TYPES = frozenset({"application", "aad application", "entra application"})
_PERM_RANK = {"none": 0, "": 0, "indirect": 1, "yes": 2, "direct": 2}


class PermissionTargetNotFoundError(Exception):
    """Raised when one of the compared users or permission sets does not exist."""


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class UserRoleAssignment(_CamelModel):
    role_id: str
    role_name: str = ""
    company: str = ""
    scope: str = ""
    type: str = ""
    security_group_code: str = ""
    app_id: str | None = None
    app_name: str = ""


class UserPermissionSummary(_CamelModel):
    user_security_id: str
    user_name: str
    full_name: str = ""
    state: str = ""
    license_type: str = ""
    application_id: str | None = None
    principal_type: Literal["user", "application"]
    is_super: bool
    assignments: list[UserRoleAssignment]


class PermissionSetSummary(_CamelModel):
    id: str
    display_name: str = ""
    scope: str = ""
    app_id: str | None = None
    extension_name: str = ""


class PermissionUsersResponse(_CamelModel):
    users: list[UserPermissionSummary]
    permission_sets: list[PermissionSetSummary]
    companies: list[str]


class ObjectAccessHolder(_CamelModel):
    user_security_id: str
    user_name: str
    full_name: str = ""
    principal_type: Literal["user", "application"]
    state: str = ""
    company: str = ""
    scope: str = ""
    type: str = ""
    security_group_code: str = ""


class ObjectAccessMatch(_CamelModel):
    object_type: str
    object_id: int
    object_name: str
    al_object_name: str = ""
    role_id: str
    role_name: str = ""
    scope: str = ""
    app_name: str = ""
    read_permission: str
    insert_permission: str
    modify_permission: str
    delete_permission: str
    execute_permission: str
    is_sensitive: bool
    holders: list[ObjectAccessHolder]


class ObjectAccessSearchResponse(_CamelModel):
    total_matches: int
    truncated: bool
    matches: list[ObjectAccessMatch]


class DiffSection[ItemT](_CamelModel):
    only_left: list[ItemT]
    only_right: list[ItemT]
    same: list[ItemT]


class DiffRoleItem(_CamelModel):
    role_id: str
    role_name: str = ""
    company: str = ""
    scope: str = ""
    type: str = ""
    security_group_code: str = ""
    is_sensitive: bool


class DiffObjectItem(_CamelModel):
    object_type: str
    object_id: int
    object_name: str
    read_permission: str
    insert_permission: str
    modify_permission: str
    delete_permission: str
    execute_permission: str
    is_sensitive: bool


class PermissionDiffResponse(_CamelModel):
    kind: Literal["user", "role"]
    left_label: str
    right_label: str
    role_diff: DiffSection[DiffRoleItem]
    object_diff: DiffSection[DiffObjectItem]


@dataclass(frozen=True)
class ObjectSearchQuery:
    query: str
    object_type: str | None
    access: str
    company: str | None


@dataclass(frozen=True)
class DiffQuery:
    kind: Literal["user", "role"]
    left: str
    right: str


def _text(value: object) -> str:
    if value is None:
        return ""
    return value.strip() if isinstance(value, str) else str(value).strip()


def _optional_guid(value: object) -> str | None:
    text = _text(value)
    if not text or text.casefold() == _ZERO_GUID:
        return None
    return text


def _int_value(value: object) -> int:
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    text = _text(value)
    try:
        return int(text)
    except ValueError:
        return 0


def _perm_text(value: object) -> str:
    text = _text(value)
    return text if text else "None"


def _has_perm(value: str) -> bool:
    return bool(value) and value.casefold() != "none"


def _perm_rank(value: str) -> int:
    return _PERM_RANK.get(value.casefold(), 2 if _has_perm(value) else 0)


def _max_perm(current: str, incoming: str) -> str:
    return incoming if _perm_rank(incoming) > _perm_rank(current) else current


def _principal_type(
    application_id: str | None, license_type: str
) -> Literal["user", "application"]:
    if application_id is not None or license_type.casefold() in _APP_LICENSE_TYPES:
        return "application"
    return "user"


def _is_super_role(role_id: str) -> bool:
    return role_id.strip().upper() == "SUPER"


def _is_sensitive_object(
    role_id: str, insert_perm: str, modify_perm: str, delete_perm: str
) -> bool:
    return (
        _is_super_role(role_id)
        or _has_perm(insert_perm)
        or _has_perm(modify_perm)
        or _has_perm(delete_perm)
    )


def _matches_access(
    access: str,
    role_id: str,
    read_perm: str,
    insert_perm: str,
    modify_perm: str,
    delete_perm: str,
    execute_perm: str,
) -> bool:
    match access:
        case "any":
            return _is_super_role(role_id) or any(
                _has_perm(p)
                for p in (
                    read_perm,
                    insert_perm,
                    modify_perm,
                    delete_perm,
                    execute_perm,
                )
            )
        case "write":
            return (
                _has_perm(insert_perm)
                or _has_perm(modify_perm)
                or _has_perm(delete_perm)
            )
        case "read":
            return _has_perm(read_perm)
        case "insert":
            return _has_perm(insert_perm)
        case "modify":
            return _has_perm(modify_perm)
        case "delete":
            return _has_perm(delete_perm)
        case "execute":
            return _has_perm(execute_perm)
        case _:
            return False


def _role_matches(
    left_role_id: str,
    left_scope: str,
    left_app_id: str | None,
    right_role_id: str,
    right_scope: str,
    right_app_id: str | None,
) -> bool:
    if left_role_id.casefold() != right_role_id.casefold():
        return False
    if left_scope and right_scope and left_scope.casefold() != right_scope.casefold():
        return False
    return not (
        left_app_id
        and right_app_id
        and left_app_id.casefold() != right_app_id.casefold()
    )


def _parse_assignment(row: dict[str, object]) -> tuple[str, UserRoleAssignment]:
    user_id = _text(row.get("userSecurityId"))
    assignment = UserRoleAssignment(
        role_id=_text(row.get("roleId")),
        role_name=_text(row.get("roleName")),
        company=_text(row.get("company")),
        scope=_text(row.get("scope")),
        type=_text(row.get("type")),
        security_group_code=_text(row.get("securityGroupCode")),
        app_id=_optional_guid(row.get("appId")),
        app_name=_text(row.get("appName")),
    )
    return user_id, assignment


def _build_users(
    users_rows: list[dict[str, object]],
    user_sets_rows: list[dict[str, object]],
) -> tuple[list[UserPermissionSummary], list[str]]:
    assignments_by_user: dict[str, list[UserRoleAssignment]] = {}
    companies_set: set[str] = set()
    for row in user_sets_rows:
        user_id, assignment = _parse_assignment(row)
        if assignment.company:
            companies_set.add(assignment.company)
        if user_id and assignment.role_id:
            assignments_by_user.setdefault(user_id.casefold(), []).append(assignment)

    users: list[UserPermissionSummary] = []
    for row in users_rows:
        user_id = _text(row.get("userSecurityId"))
        if not user_id:
            continue
        application_id = _optional_guid(row.get("applicationId"))
        license_type = _text(row.get("licenseType"))
        assignments = sorted(
            assignments_by_user.get(user_id.casefold(), []),
            key=lambda item: (
                item.role_id.casefold(),
                item.company.casefold(),
                item.scope.casefold(),
                item.type.casefold(),
                item.security_group_code.casefold(),
            ),
        )
        users.append(
            UserPermissionSummary(
                user_security_id=user_id,
                user_name=_text(row.get("userName")),
                full_name=_text(row.get("fullName")),
                state=_text(row.get("state")),
                license_type=license_type,
                application_id=application_id,
                principal_type=_principal_type(application_id, license_type),
                is_super=any(_is_super_role(item.role_id) for item in assignments),
                assignments=assignments,
            )
        )

    users.sort(
        key=lambda user: (
            user.user_name.casefold(),
            user.full_name.casefold(),
            user.user_security_id.casefold(),
        )
    )
    return users, sorted(companies_set, key=str.casefold)


def _build_permission_sets(
    perm_sets_rows: list[dict[str, object]],
) -> list[PermissionSetSummary]:
    deduped: dict[tuple[str, str, str], PermissionSetSummary] = {}
    for row in perm_sets_rows:
        role_id = _text(row.get("id")) or _text(row.get("roleId"))
        if not role_id:
            continue
        scope = _text(row.get("scope"))
        app_id = _optional_guid(row.get("appId"))
        key = (role_id.casefold(), scope.casefold(), (app_id or "").casefold())
        if key not in deduped:
            deduped[key] = PermissionSetSummary(
                id=role_id,
                display_name=_text(row.get("displayName")) or role_id,
                scope=scope,
                app_id=app_id,
                extension_name=_text(row.get("extensionName")),
            )
    return sorted(
        deduped.values(),
        key=lambda item: (
            item.id.casefold(),
            item.scope.casefold(),
            (item.app_id or "").casefold(),
        ),
    )


async def get_permission_users(client: BCClient) -> PermissionUsersResponse:
    """Fetch users, role assignments, and permission sets concurrently from BC."""
    users_rows, user_sets_rows, perm_sets_rows = await asyncio.gather(
        client.automation.list_records("usersPermissions", company_scoped=True),
        client.automation.list_records("accessControls", company_scoped=True),
        client.automation.list_records("permissionSets", company_scoped=True),
    )
    users, companies = _build_users(users_rows, user_sets_rows)
    permission_sets = _build_permission_sets(perm_sets_rows)
    return PermissionUsersResponse(
        users=users,
        permission_sets=permission_sets,
        companies=companies,
    )


async def search_object_access(
    client: BCClient, query: ObjectSearchQuery
) -> ObjectAccessSearchResponse:
    """Search expandedPermissionSets joined with accessControls and usersPermissions."""
    expanded_rows, user_sets_rows, users_rows = await asyncio.gather(
        client.automation.list_records("expandedPermissionSets", company_scoped=True),
        client.automation.list_records("accessControls", company_scoped=True),
        client.automation.list_records("usersPermissions", company_scoped=True),
    )

    users, _ = _build_users(users_rows, [])
    users_by_id = {user.user_security_id.casefold(): user for user in users}

    assignments_by_role: dict[str, list[tuple[str, UserRoleAssignment]]] = {}
    for row in user_sets_rows:
        user_id, assignment = _parse_assignment(row)
        if not user_id or not assignment.role_id:
            continue
        assignments_by_role.setdefault(assignment.role_id.casefold(), []).append(
            (user_id, assignment)
        )

    needle = query.query.casefold()
    company_fold = query.company.casefold() if query.company is not None else None
    all_matches: list[ObjectAccessMatch] = []

    for row in expanded_rows:
        object_type = _text(row.get("objectType"))
        if query.object_type is not None and object_type != query.object_type:
            continue

        object_id = _int_value(row.get("objectId"))
        al_object_name = _text(row.get("alObjectName"))
        object_name = _text(row.get("objectName")) or al_object_name
        if (
            needle not in object_name.casefold()
            and needle not in al_object_name.casefold()
            and needle not in str(object_id)
        ):
            continue

        role_id = _text(row.get("roleId"))
        read_perm = _perm_text(row.get("readPermission"))
        insert_perm = _perm_text(row.get("insertPermission"))
        modify_perm = _perm_text(row.get("modifyPermission"))
        delete_perm = _perm_text(row.get("deletePermission"))
        execute_perm = _perm_text(row.get("executePermission"))

        if not _matches_access(
            query.access,
            role_id,
            read_perm,
            insert_perm,
            modify_perm,
            delete_perm,
            execute_perm,
        ):
            continue

        scope = _text(row.get("scope"))
        app_id = _optional_guid(row.get("appId"))
        holders_map: dict[tuple[str, str, str, str], ObjectAccessHolder] = {}

        for user_id, assignment in assignments_by_role.get(role_id.casefold(), []):
            if not _role_matches(
                assignment.role_id,
                assignment.scope,
                assignment.app_id,
                role_id,
                scope,
                app_id,
            ):
                continue
            if (
                company_fold is not None
                and assignment.company
                and (assignment.company.casefold() != company_fold)
            ):
                continue
            user = users_by_id.get(user_id.casefold())
            if user is None:
                continue
            holder_key = (
                user.user_security_id.casefold(),
                assignment.company.casefold(),
                assignment.type.casefold(),
                assignment.security_group_code.casefold(),
            )
            if holder_key not in holders_map:
                holders_map[holder_key] = ObjectAccessHolder(
                    user_security_id=user.user_security_id,
                    user_name=user.user_name,
                    full_name=user.full_name,
                    principal_type=user.principal_type,
                    state=user.state,
                    company=assignment.company,
                    scope=assignment.scope,
                    type=assignment.type,
                    security_group_code=assignment.security_group_code,
                )

        if company_fold is not None and not holders_map:
            continue

        holders = sorted(
            holders_map.values(),
            key=lambda h: (
                h.user_name.casefold(),
                h.company.casefold(),
                h.user_security_id.casefold(),
            ),
        )
        all_matches.append(
            ObjectAccessMatch(
                object_type=object_type,
                object_id=object_id,
                object_name=object_name,
                al_object_name=al_object_name,
                role_id=role_id,
                role_name=_text(row.get("roleName")),
                scope=scope,
                app_name=_text(row.get("appName")),
                read_permission=read_perm,
                insert_permission=insert_perm,
                modify_permission=modify_perm,
                delete_permission=delete_perm,
                execute_permission=execute_perm,
                is_sensitive=_is_sensitive_object(
                    role_id, insert_perm, modify_perm, delete_perm
                ),
                holders=holders,
            )
        )

    all_matches.sort(
        key=lambda m: (
            m.object_type.casefold(),
            m.object_id,
            m.object_name.casefold(),
            m.role_id.casefold(),
            m.scope.casefold(),
        )
    )
    total_matches = len(all_matches)
    return ObjectAccessSearchResponse(
        total_matches=total_matches,
        truncated=total_matches > MAX_OBJECT_MATCHES,
        matches=all_matches[:MAX_OBJECT_MATCHES],
    )


def _aggregate_objects_for_roles(
    expanded_rows: list[dict[str, object]],
    role_refs: list[tuple[str, str, str | None]],
) -> dict[tuple[str, int], DiffObjectItem]:
    aggregated: dict[tuple[str, int], DiffObjectItem] = {}
    for row in expanded_rows:
        exp_role_id = _text(row.get("roleId"))
        exp_scope = _text(row.get("scope"))
        exp_app_id = _optional_guid(row.get("appId"))
        if not any(
            _role_matches(role_id, scope, app_id, exp_role_id, exp_scope, exp_app_id)
            for role_id, scope, app_id in role_refs
        ):
            continue

        object_type = _text(row.get("objectType"))
        object_id = _int_value(row.get("objectId"))
        object_name = _text(row.get("objectName")) or _text(row.get("alObjectName"))
        read_perm = _perm_text(row.get("readPermission"))
        insert_perm = _perm_text(row.get("insertPermission"))
        modify_perm = _perm_text(row.get("modifyPermission"))
        delete_perm = _perm_text(row.get("deletePermission"))
        execute_perm = _perm_text(row.get("executePermission"))

        key = (object_type.casefold(), object_id)
        existing = aggregated.get(key)
        if existing is None:
            aggregated[key] = DiffObjectItem(
                object_type=object_type,
                object_id=object_id,
                object_name=object_name,
                read_permission=read_perm,
                insert_permission=insert_perm,
                modify_permission=modify_perm,
                delete_permission=delete_perm,
                execute_permission=execute_perm,
                is_sensitive=_is_sensitive_object(
                    exp_role_id, insert_perm, modify_perm, delete_perm
                ),
            )
        else:
            next_insert = _max_perm(existing.insert_permission, insert_perm)
            next_modify = _max_perm(existing.modify_permission, modify_perm)
            next_delete = _max_perm(existing.delete_permission, delete_perm)
            aggregated[key] = DiffObjectItem(
                object_type=existing.object_type or object_type,
                object_id=object_id,
                object_name=existing.object_name or object_name,
                read_permission=_max_perm(existing.read_permission, read_perm),
                insert_permission=next_insert,
                modify_permission=next_modify,
                delete_permission=next_delete,
                execute_permission=_max_perm(existing.execute_permission, execute_perm),
                is_sensitive=existing.is_sensitive
                or _is_sensitive_object(
                    exp_role_id, next_insert, next_modify, next_delete
                ),
            )
    return aggregated


def _diff_objects(
    left_map: dict[tuple[str, int], DiffObjectItem],
    right_map: dict[tuple[str, int], DiffObjectItem],
) -> DiffSection[DiffObjectItem]:
    only_left: list[DiffObjectItem] = []
    only_right: list[DiffObjectItem] = []
    same: list[DiffObjectItem] = []

    for key in set(left_map) | set(right_map):
        left_item = left_map.get(key)
        right_item = right_map.get(key)
        if left_item is not None and right_item is not None:
            left_sig = (
                left_item.read_permission.casefold(),
                left_item.insert_permission.casefold(),
                left_item.modify_permission.casefold(),
                left_item.delete_permission.casefold(),
                left_item.execute_permission.casefold(),
            )
            right_sig = (
                right_item.read_permission.casefold(),
                right_item.insert_permission.casefold(),
                right_item.modify_permission.casefold(),
                right_item.delete_permission.casefold(),
                right_item.execute_permission.casefold(),
            )
            if left_sig == right_sig:
                same.append(left_item)
            else:
                only_left.append(left_item)
                only_right.append(right_item)
        elif left_item is not None:
            only_left.append(left_item)
        elif right_item is not None:
            only_right.append(right_item)

    def sort_key(item: DiffObjectItem) -> tuple[str, int, str]:
        return (
            item.object_type.casefold(),
            item.object_id,
            item.object_name.casefold(),
        )

    return DiffSection(
        only_left=sorted(only_left, key=sort_key),
        only_right=sorted(only_right, key=sort_key),
        same=sorted(same, key=sort_key),
    )


def _diff_roles(
    left_assignments: list[UserRoleAssignment],
    right_assignments: list[UserRoleAssignment],
) -> DiffSection[DiffRoleItem]:
    def to_map(
        assignments: list[UserRoleAssignment],
    ) -> dict[tuple[str, str, str], DiffRoleItem]:
        mapped: dict[tuple[str, str, str], DiffRoleItem] = {}
        for item in assignments:
            key = (
                item.role_id.casefold(),
                item.company.casefold(),
                item.scope.casefold(),
            )
            if key not in mapped:
                mapped[key] = DiffRoleItem(
                    role_id=item.role_id,
                    role_name=item.role_name,
                    company=item.company,
                    scope=item.scope,
                    type=item.type,
                    security_group_code=item.security_group_code,
                    is_sensitive=_is_super_role(item.role_id),
                )
        return mapped

    left_map = to_map(left_assignments)
    right_map = to_map(right_assignments)
    only_left: list[DiffRoleItem] = []
    only_right: list[DiffRoleItem] = []
    same: list[DiffRoleItem] = []

    for key in set(left_map) | set(right_map):
        left_item = left_map.get(key)
        right_item = right_map.get(key)
        if left_item is not None and right_item is not None:
            same.append(
                DiffRoleItem(
                    role_id=left_item.role_id,
                    role_name=left_item.role_name or right_item.role_name,
                    company=left_item.company,
                    scope=left_item.scope,
                    type=left_item.type if left_item.type == right_item.type else "",
                    security_group_code=(
                        left_item.security_group_code
                        if left_item.security_group_code
                        == right_item.security_group_code
                        else ""
                    ),
                    is_sensitive=left_item.is_sensitive,
                )
            )
        elif left_item is not None:
            only_left.append(left_item)
        elif right_item is not None:
            only_right.append(right_item)

    def sort_key(item: DiffRoleItem) -> tuple[str, str, str]:
        return (item.role_id.casefold(), item.company.casefold(), item.scope.casefold())

    return DiffSection(
        only_left=sorted(only_left, key=sort_key),
        only_right=sorted(only_right, key=sort_key),
        same=sorted(same, key=sort_key),
    )


def _user_label(user: UserPermissionSummary) -> str:
    if user.full_name and user.user_name and user.full_name != user.user_name:
        return f"{user.full_name} ({user.user_name})"
    return user.full_name or user.user_name or user.user_security_id


def _role_label(role: PermissionSetSummary) -> str:
    if role.display_name and role.display_name != role.id:
        return f"{role.display_name} ({role.id})"
    return role.id


async def get_permission_diff(
    client: BCClient, query: DiffQuery
) -> PermissionDiffResponse:
    """Compare two users (userSecurityId) or two permission sets (roleId)."""
    if query.kind == "user":
        users_rows, user_sets_rows, expanded_rows = await asyncio.gather(
            client.automation.list_records("usersPermissions", company_scoped=True),
            client.automation.list_records("accessControls", company_scoped=True),
            client.automation.list_records(
                "expandedPermissionSets", company_scoped=True
            ),
        )
        users, _ = _build_users(users_rows, user_sets_rows)
        users_by_id = {user.user_security_id.casefold(): user for user in users}
        left_user = users_by_id.get(query.left.casefold())
        right_user = users_by_id.get(query.right.casefold())
        if left_user is None or right_user is None:
            raise PermissionTargetNotFoundError(
                "User atau aplikasi yang dibandingkan tidak ditemukan."
            )

        left_refs = [
            (item.role_id, item.scope, item.app_id) for item in left_user.assignments
        ]
        right_refs = [
            (item.role_id, item.scope, item.app_id) for item in right_user.assignments
        ]
        return PermissionDiffResponse(
            kind="user",
            left_label=_user_label(left_user),
            right_label=_user_label(right_user),
            role_diff=_diff_roles(left_user.assignments, right_user.assignments),
            object_diff=_diff_objects(
                _aggregate_objects_for_roles(expanded_rows, left_refs),
                _aggregate_objects_for_roles(expanded_rows, right_refs),
            ),
        )

    perm_sets_rows, expanded_rows = await asyncio.gather(
        client.automation.list_records("permissionSets", company_scoped=True),
        client.automation.list_records("expandedPermissionSets", company_scoped=True),
    )
    permission_sets = _build_permission_sets(perm_sets_rows)
    roles_by_id: dict[str, list[PermissionSetSummary]] = {}
    for role in permission_sets:
        roles_by_id.setdefault(role.id.casefold(), []).append(role)

    expanded_roles: set[str] = {
        _text(row.get("roleId")).casefold()
        for row in expanded_rows
        if _text(row.get("roleId"))
    }

    def resolve_role(
        target: str,
    ) -> tuple[str, list[tuple[str, str, str | None]], UserRoleAssignment]:
        matches = roles_by_id.get(target.casefold(), [])
        if matches:
            primary = matches[0]
            refs = [(item.id, item.scope, item.app_id) for item in matches]
            assignment = UserRoleAssignment(
                role_id=primary.id,
                role_name=primary.display_name,
                scope=primary.scope,
                app_id=primary.app_id,
            )
            return _role_label(primary), refs, assignment
        if target.casefold() in expanded_roles:
            return target, [(target, "", None)], UserRoleAssignment(role_id=target)
        raise PermissionTargetNotFoundError(
            "Permission set yang dibandingkan tidak ditemukan."
        )

    left_label, left_refs, left_assignment = resolve_role(query.left)
    right_label, right_refs, right_assignment = resolve_role(query.right)
    return PermissionDiffResponse(
        kind="role",
        left_label=left_label,
        right_label=right_label,
        role_diff=_diff_roles([left_assignment], [right_assignment]),
        object_diff=_diff_objects(
            _aggregate_objects_for_roles(expanded_rows, left_refs),
            _aggregate_objects_for_roles(expanded_rows, right_refs),
        ),
    )
