import { Alert, Button, Empty, Select, Spin, Table, Tabs, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SwapOutlined } from "@ant-design/icons";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  loadPermissionDiff,
  userDisplayLabel,
  type DiffKind,
  type DiffObjectItem,
  type DiffRoleItem,
  type PermissionClient,
  type PermissionDiffResponse,
  type PermissionSetSummary,
  type UserPermissionSummary,
} from "./api";
import { PermissionStrip, SensitiveTag } from "./PermissionBadges";

interface DiffTabProps {
  users: UserPermissionSummary[];
  permissionSets: PermissionSetSummary[];
  client?: PermissionClient;
  initialState?: DiffState;
}

export type DiffState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: PermissionDiffResponse }
  | { status: "error"; message: string };

const roleDiffColumns: ColumnsType<DiffRoleItem> = [
  {
    title: "Role ID",
    dataIndex: "roleId",
    key: "roleId",
    render: (value: string, row) => (
      <span>
        <span className="pa-mono">{value}</span>
        {row.roleName && row.roleName !== value && (
          <Typography.Text type="secondary"> · {row.roleName}</Typography.Text>
        )}
      </span>
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
  {
    title: "Type",
    dataIndex: "type",
    key: "type",
    render: (value?: string | null) => value || "—",
  },
  {
    title: "Security Group",
    dataIndex: "securityGroupCode",
    key: "securityGroupCode",
    render: (value?: string | null) =>
      value?.trim() ? <span className="pa-mono">{value}</span> : "—",
  },
];

const objectDiffColumns: ColumnsType<DiffObjectItem> = [
  {
    title: "Objek",
    key: "object",
    render: (_, row) => (
      <span>
        <Tag>{row.objectType}</Tag>
        <Typography.Text strong className="pa-mono">
          {row.objectId}
        </Typography.Text>{" "}
        <span>{row.objectName}</span>
      </span>
    ),
  },
  {
    title: "Izin (R/I/M/D/E)",
    key: "permissions",
    render: (_, row) => <PermissionStrip item={row} />,
  },
  {
    title: "Sensitif",
    dataIndex: "isSensitive",
    key: "isSensitive",
    width: 110,
    render: (value?: boolean) => <SensitiveTag isSensitive={value} />,
  },
];

function DiffBucketPanel({
  kind,
  roles,
  objects,
  emptyLabel,
}: {
  kind: DiffKind;
  roles: DiffRoleItem[];
  objects: DiffObjectItem[];
  emptyLabel: string;
}) {
  const showRoleSection = kind === "user" || roles.length > 0;
  const isEmpty = (!showRoleSection || roles.length === 0) && objects.length === 0;

  if (isEmpty) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />;
  }

  return (
    <div>
      {showRoleSection && (
        <section className="pa-diff-section">
          <h3 className="pa-diff-section-title">Permission Set ({roles.length})</h3>
          {roles.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada perbedaan permission set." />
          ) : (
            <Table<DiffRoleItem>
              rowKey={item =>
                `${item.roleId}|${item.company ?? ""}|${item.scope ?? ""}|${item.type ?? ""}|${item.securityGroupCode ?? ""}`
              }
              columns={roleDiffColumns}
              dataSource={roles}
              size="small"
              scroll={{ x: "max-content" }}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
            />
          )}
        </section>
      )}
      <section className="pa-diff-section">
        <h3 className="pa-diff-section-title">Akses Objek R/I/M/D/E ({objects.length})</h3>
        {objects.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada entri objek pada bagian ini." />
        ) : (
          <Table<DiffObjectItem>
            rowKey={item =>
              `${item.objectType}|${item.objectId}|${item.readPermission ?? ""}|${item.insertPermission ?? ""}|${item.modifyPermission ?? ""}|${item.deletePermission ?? ""}|${item.executePermission ?? ""}`
            }
            columns={objectDiffColumns}
            dataSource={objects}
            size="small"
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 15, showSizeChanger: true, hideOnSinglePage: true }}
          />
        )}
      </section>
    </div>
  );
}

export function DiffTab({
  users,
  permissionSets,
  client,
  initialState = { status: "idle" },
}: DiffTabProps) {
  const { token } = theme.useToken();
  const baseId = useId();
  const [kind, setKind] = useState<DiffKind>("user");
  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [state, setState] = useState<DiffState>(initialState);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const options = useMemo(() => {
    if (kind === "user") {
      return users.map(user => ({
        value: user.userSecurityId,
        label: userDisplayLabel(user),
      }));
    }
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];
    for (const set of permissionSets) {
      if (seen.has(set.id)) continue;
      seen.add(set.id);
      const label =
        set.displayName && set.displayName !== set.id
          ? `${set.id} — ${set.displayName}`
          : set.id;
      list.push({ value: set.id, label });
    }
    return list;
  }, [kind, users, permissionSets]);

  function handleModeChange(nextKind: DiffKind) {
    setKind(nextKind);
    setLeft("");
    setRight("");
    setValidationError(null);
    setState({ status: "idle" });
  }

  async function compare() {
    if (!left || !right) {
      setValidationError("Pilih item Kiri (A) dan Kanan (B) terlebih dahulu.");
      return;
    }
    setValidationError(null);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: "loading" });

    try {
      const data = await loadPermissionDiff({ kind, left, right }, controller.signal, client);
      if (!controller.signal.aborted) {
        setState({ status: "ready", data });
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message =
          reason instanceof Error && reason.message
            ? reason.message
            : "Perbandingan izin gagal dimuat.";
        setState({ status: "error", message });
      }
    }
  }

  return (
    <div>
      <div className="pa-diff-controls">
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-diff-mode`}>Mode</label>
          <Select<DiffKind>
            id={`${baseId}-diff-mode`}
            value={kind}
            onChange={handleModeChange}
            options={[
              { value: "user", label: "User / Aplikasi" },
              { value: "role", label: "Permission Set" },
            ]}
          />
        </div>
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-diff-left`}>Kiri (A)</label>
          <Select<string>
            id={`${baseId}-diff-left`}
            showSearch
            optionFilterProp="label"
            placeholder={kind === "user" ? "Pilih user / aplikasi A" : "Pilih permission set A"}
            value={left || undefined}
            onChange={value => {
              setLeft(value);
              if (validationError) setValidationError(null);
            }}
            options={options}
          />
        </div>
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-diff-right`}>Kanan (B)</label>
          <Select<string>
            id={`${baseId}-diff-right`}
            showSearch
            optionFilterProp="label"
            placeholder={kind === "user" ? "Pilih user / aplikasi B" : "Pilih permission set B"}
            value={right || undefined}
            onChange={value => {
              setRight(value);
              if (validationError) setValidationError(null);
            }}
            options={options}
          />
        </div>
        <Button
          type="primary"
          icon={<SwapOutlined aria-hidden="true" />}
          loading={state.status === "loading"}
          onClick={() => void compare()}
        >
          Bandingkan
        </Button>
      </div>

      {validationError && (
        <Alert
          type="warning"
          showIcon
          message={validationError}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      {state.status === "idle" && (
        <div
          className="pa-state-box"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Pilih dua user/aplikasi atau dua permission set lalu klik Bandingkan."
          />
        </div>
      )}

      {state.status === "loading" && (
        <div className="pa-state-box" role="status">
          <Spin />
          <div>Menghitung perbedaan izin…</div>
        </div>
      )}

      {state.status === "error" && (
        <Alert type="error" showIcon message={state.message} />
      )}

      {state.status === "ready" && (
        <div>
          <div className="pa-summary-row" role="status">
            <span>
              Membandingkan <strong>{state.data.leftLabel}</strong> (A) dengan{" "}
              <strong>{state.data.rightLabel}</strong> (B)
            </span>
          </div>
          <Tabs
            defaultActiveKey="onlyLeft"
            items={[
              {
                key: "onlyLeft",
                label: `Hanya di A (${state.data.roleDiff.onlyLeft.length + state.data.objectDiff.onlyLeft.length})`,
                children: (
                  <DiffBucketPanel
                    kind={state.data.kind}
                    roles={state.data.roleDiff.onlyLeft}
                    objects={state.data.objectDiff.onlyLeft}
                    emptyLabel="Tidak ada izin yang hanya dimiliki A."
                  />
                ),
              },
              {
                key: "onlyRight",
                label: `Hanya di B (${state.data.roleDiff.onlyRight.length + state.data.objectDiff.onlyRight.length})`,
                children: (
                  <DiffBucketPanel
                    kind={state.data.kind}
                    roles={state.data.roleDiff.onlyRight}
                    objects={state.data.objectDiff.onlyRight}
                    emptyLabel="Tidak ada izin yang hanya dimiliki B."
                  />
                ),
              },
              {
                key: "same",
                label: `Sama (${state.data.roleDiff.same.length + state.data.objectDiff.same.length})`,
                children: (
                  <DiffBucketPanel
                    kind={state.data.kind}
                    roles={state.data.roleDiff.same}
                    objects={state.data.objectDiff.same}
                    emptyLabel="Tidak ada izin yang sama antara A dan B."
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
