import createClient from "openapi-fetch";
import type { components, paths } from "../../api/schema";

export type UserRoleAssignment = components["schemas"]["UserRoleAssignment"];
export type UserPermissionSummary = components["schemas"]["UserPermissionSummary"];
export type PermissionSetSummary = components["schemas"]["PermissionSetSummary"];
export type PermissionUsersResponse = components["schemas"]["PermissionUsersResponse"];
export type ObjectAccessHolder = components["schemas"]["ObjectAccessHolder"];
export type ObjectAccessMatch = components["schemas"]["ObjectAccessMatch"];
export type ObjectAccessSearchResponse = components["schemas"]["ObjectAccessSearchResponse"];
export type DiffRoleItem = components["schemas"]["DiffRoleItem"];
export type DiffObjectItem = components["schemas"]["DiffObjectItem"];
export type PermissionDiffResponse = components["schemas"]["PermissionDiffResponse"];

export type PrincipalType = UserPermissionSummary["principalType"];
export type PrincipalFilter = "all" | PrincipalType;
export type ObjectSearchParams = paths["/api/v1/permission-analyzer/objects"]["get"]["parameters"]["query"];
export type ObjectTypeValue = NonNullable<ObjectSearchParams["object_type"]>;
export type ObjectTypeFilter = "all" | ObjectTypeValue;
export type AccessFilter = NonNullable<ObjectSearchParams["access"]>;
export type DiffKind = PermissionDiffResponse["kind"];

export interface ObjectSearchQuery {
  query: string;
  objectType?: ObjectTypeFilter;
  access?: AccessFilter;
  company?: string;
}

export interface DiffQuery {
  kind: DiffKind;
  left: string;
  right: string;
}

export interface UserFilterOptions {
  search: string;
  principalType: PrincipalFilter;
  company: string;
  onlySuper: boolean;
}

const api = createClient<paths>();
export type PermissionClient = typeof api;

export function extractApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as components["schemas"]["ErrorResponse"]).error;
    if (err?.message && err.message.trim()) {
      return err.code ? `${err.message} (${err.code})` : err.message;
    }
  }
  return fallback;
}

export async function loadPermissionUsers(
  signal: AbortSignal,
  client: PermissionClient = api,
): Promise<PermissionUsersResponse> {
  const { data, error, response } = await client.GET("/api/v1/permission-analyzer/users", {
    signal,
  });
  if (!response.ok || !data) {
    throw new Error(
      extractApiErrorMessage(
        error,
        "Data user dan permission set gagal dimuat. Periksa backend lokal.",
      ),
    );
  }
  return data;
}

export async function searchObjectAccess(
  query: ObjectSearchQuery,
  signal: AbortSignal,
  client: PermissionClient = api,
): Promise<ObjectAccessSearchResponse> {
  const params: ObjectSearchParams = {
    query: query.query.trim(),
    object_type: query.objectType && query.objectType !== "all" ? query.objectType : undefined,
    access: query.access && query.access !== "any" ? query.access : undefined,
    company: query.company || undefined,
  };
  const { data, error, response } = await client.GET("/api/v1/permission-analyzer/objects", {
    signal,
    params: { query: params },
  });
  if (!response.ok || !data) {
    throw new Error(extractApiErrorMessage(error, "Pencarian akses objek gagal dimuat."));
  }
  return data;
}

export async function loadPermissionDiff(
  query: DiffQuery,
  signal: AbortSignal,
  client: PermissionClient = api,
): Promise<PermissionDiffResponse> {
  const { data, error, response } = await client.GET("/api/v1/permission-analyzer/diff", {
    signal,
    params: { query },
  });
  if (!response.ok || !data) {
    throw new Error(extractApiErrorMessage(error, "Perbandingan izin gagal dimuat."));
  }
  return data;
}

export function filterUsers(
  users: UserPermissionSummary[],
  filters: UserFilterOptions,
): UserPermissionSummary[] {
  const q = filters.search.trim().toLowerCase();
  return users.filter(user => {
    if (filters.principalType !== "all" && user.principalType !== filters.principalType) {
      return false;
    }
    if (filters.onlySuper && !user.isSuper) {
      return false;
    }
    if (filters.company) {
      const hasCompany = user.assignments.some(
        item => (item.company ?? "").trim() === filters.company,
      );
      if (!hasCompany) return false;
    }
    if (!q) return true;
    const matchesUser =
      user.userName.toLowerCase().includes(q) ||
      user.fullName.toLowerCase().includes(q) ||
      (user.applicationId ?? "").toLowerCase().includes(q);
    if (matchesUser) return true;
    return user.assignments.some(
      item =>
        item.roleId.toLowerCase().includes(q) ||
        item.roleName.toLowerCase().includes(q) ||
        item.securityGroupCode.toLowerCase().includes(q),
    );
  });
}

export function userDisplayLabel(user: UserPermissionSummary): string {
  const name = user.fullName.trim() || user.userName;
  const kind = user.principalType === "application" ? "Aplikasi Entra" : "User BC";
  return `${name} (${user.userName}) · ${kind}`;
}
