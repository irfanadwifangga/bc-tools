import { Badge, Tag } from "antd";
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
