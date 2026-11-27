import { Badge, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PrincipalType } from "./api";

export function PrincipalTag({ type }: { type: PrincipalType }) {
  return type === "application" ? (
    <Tag color="blue">Aplikasi Entra</Tag>
  ) : (
    <Tag>User BC</Tag>
  );
}

export function UserStateBadge({ state }: { state?: string | null }) {
  const value = state?.trim() || "Tidak diketahui";
  const normalized = value.toLowerCase();
  const status =
    normalized === "enabled" || normalized === "active"
      ? "success"
      : normalized === "disabled"
        ? "error"
        : "default";
  return <Badge status={status} text={value} />;
}

export function SensitiveTag({
  isSuper,
  isSensitive,
}: {
  isSuper?: boolean;
  isSensitive?: boolean;
}) {
  if (isSuper) return <Tag color="error">SUPER</Tag>;
  if (isSensitive) return <Tag color="warning">Sensitif</Tag>;
  return null;
}

const PERM_FLAGS = [
  ["R", "readPermission"],
  ["I", "insertPermission"],
  ["M", "modifyPermission"],
  ["D", "deletePermission"],
  ["E", "executePermission"],
] as const;

export interface RimdeSource {
  readPermission?: string | null;
  insertPermission?: string | null;
  modifyPermission?: string | null;
  deletePermission?: string | null;
  executePermission?: string | null;
}

export function isActivePermission(value?: string | null): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized !== "" && normalized !== "none" && normalized !== "false";
}

export function PermissionStrip({ item }: { item: RimdeSource }) {
  const active = PERM_FLAGS.filter(([, key]) => isActivePermission(item[key]));
  if (active.length === 0) {
    return <Tag>None</Tag>;
  }
  return (
    <span className="pa-perms-strip" aria-label="Izin R/I/M/D/E">
      {PERM_FLAGS.map(([letter, key]) => {
        const raw = item[key]?.trim();
        if (!isActivePermission(raw)) return null;
        const isWrite = letter === "I" || letter === "M" || letter === "D";
        const isIndirect = raw?.toLowerCase() === "indirect";
        return (
          <Tag
            key={letter}
            color={isWrite ? "volcano" : "green"}
            title={`${letter}: ${raw}`}
          >
            {isIndirect ? `${letter} (Indirect)` : letter}
          </Tag>
        );
      })}
    </span>
  );
}

export interface RoleAssignmentRow {
  roleId: string;
  roleName?: string | null;
  company?: string | null;
  scope?: string | null;
  type?: string | null;
  securityGroupCode?: string | null;
}

export function roleRowKey(item: RoleAssignmentRow): string {
  return `${item.roleId}|${item.company ?? ""}|${item.scope ?? ""}|${item.type ?? ""}|${item.securityGroupCode ?? ""}`;
}

export function buildRoleColumns<T extends RoleAssignmentRow>(rows: T[]): ColumnsType<T> {
  const hasType = rows.some(item => Boolean(item.type?.trim()));
  const hasSecurityGroup = rows.some(item => Boolean(item.securityGroupCode?.trim()));
  const cols: ColumnsType<T> = [
    {
      title: "Role ID",
      dataIndex: "roleId",
      key: "roleId",
      render: (value: string, row) => (
        <div className="pa-role-cell">
          <span className="pa-mono">{value}</span>
          {row.roleName && row.roleName !== value && (
            <Typography.Text type="secondary"> · {row.roleName}</Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: "Company",
      dataIndex: "company",
      key: "company",
      render: (value?: string | null) => value?.trim() || "Semua Company",
    },
    {
      title: "Scope",
      dataIndex: "scope",
      key: "scope",
      render: (value?: string | null) => value || "—",
    },
  ];
  if (hasType) {
    cols.push({
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (value?: string | null) => value || "—",
    });
  }
  if (hasSecurityGroup) {
    cols.push({
      title: "Security Group",
      dataIndex: "securityGroupCode",
      key: "securityGroupCode",
      render: (value?: string | null) =>
        value?.trim() ? <span className="pa-mono">{value}</span> : "—",
    });
  }
  const width = `${(100 / cols.length).toFixed(2)}%`;
  return cols.map(col => ({ ...col, width }));
}
