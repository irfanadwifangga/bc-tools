import { Alert, Button, Empty, Form, Input, Select, Spin, Table, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useId, useRef, useState } from "react";
import {
  searchObjectAccess,
  type AccessFilter,
  type ObjectAccessMatch,
  type ObjectAccessSearchResponse,
  type ObjectTypeFilter,
  type PermissionClient,
} from "./api";
import { PermissionStrip, SensitiveTag } from "./PermissionBadges";

interface ObjectSearchTabProps {
  companies: string[];
  client?: PermissionClient;
  initialState?: SearchState;
}

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ObjectAccessSearchResponse }
  | { status: "error"; message: string };

const OBJECT_TYPE_OPTIONS: { value: ObjectTypeFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "TableData", label: "TableData" },
  { value: "Table", label: "Table" },
  { value: "Page", label: "Page" },
  { value: "Report", label: "Report" },
  { value: "Codeunit", label: "Codeunit" },
];

const ACCESS_OPTIONS: { value: AccessFilter; label: string }[] = [
  { value: "any", label: "Semua" },
  { value: "write", label: "Tulis/Hapus" },
  { value: "read", label: "Read" },
  { value: "insert", label: "Insert" },
  { value: "modify", label: "Modify" },
  { value: "delete", label: "Delete" },
  { value: "execute", label: "Execute" },
];

export function ObjectSearchTab({
  companies,
  client,
  initialState = { status: "idle" },
}: ObjectSearchTabProps) {
  const { token } = theme.useToken();
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [objectType, setObjectType] = useState<ObjectTypeFilter>("all");
  const [access, setAccess] = useState<AccessFilter>("any");
  const [company, setCompany] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [state, setState] = useState<SearchState>(initialState);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      setValidationError("Masukkan nama atau ID objek (1–80 karakter).");
      return;
    }
    setValidationError(null);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: "loading" });

    try {
      const data = await searchObjectAccess(
        {
          query: trimmed,
          objectType,
          access,
          company: company || undefined,
        },
        controller.signal,
        client,
      );
      if (!controller.signal.aborted) {
        setState({ status: "ready", data });
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message =
          reason instanceof Error && reason.message
            ? reason.message
            : "Pencarian akses objek gagal dimuat.";
        setState({ status: "error", message });
      }
    }
  }

  const columns: ColumnsType<ObjectAccessMatch> = [
    {
      title: "Objek",
      key: "object",
      render: (_, row) => (
        <div>
          <Tag>{row.objectType}</Tag>
          <Typography.Text strong className="pa-mono">
            {row.objectId}
          </Typography.Text>{" "}
          <span>{row.objectName}</span>
        </div>
      ),
    },
    {
      title: "Role ID",
      dataIndex: "roleId",
      key: "roleId",
      render: (value: string, row) => (
        <div>
          <span className="pa-mono">{value}</span>
          {row.roleName && row.roleName !== value && (
            <div>
              <Typography.Text type="secondary">{row.roleName}</Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Izin (R/I/M/D/E)",
      key: "permissions",
      render: (_, row) => <PermissionStrip item={row} />,
    },
    {
      title: "Sensitif",
      key: "sensitive",
      width: 110,
      render: (_, row) => (
        <SensitiveTag isSuper={row.roleId === "SUPER"} isSensitive={row.isSensitive} />
      ),
    },
    {
      title: "Pemegang Akses",
      key: "holders",
      render: (_, row) => {
        if (row.holders.length === 0) {
          return <Typography.Text type="secondary">Tidak terpasang ke user</Typography.Text>;
        }
        return (
          <div className="pa-holders-list">
            {row.holders.map(holder => (
              <Tag
                key={`${holder.userSecurityId}|${holder.company}|${holder.securityGroupCode}`}
                color={holder.principalType === "application" ? "blue" : undefined}
              >
                {holder.fullName.trim() || holder.userName}
                {holder.company ? ` (${holder.company})` : ""}
              </Tag>
            ))}
          </div>
        );
      },
    },
  ];

  const companyOptions = [
    { value: "", label: "Semua company" },
    ...companies.map(name => ({ value: name, label: name })),
  ];

  return (
    <div>
      <Form
        layout="vertical"
        onFinish={() => void runSearch()}
        aria-label="Form pencarian akses objek"
      >
        <div className="pa-filter-bar">
          <div className="pa-filter-field">
            <label htmlFor={`${baseId}-obj-query`}>Nama atau ID objek</label>
            <Input
              id={`${baseId}-obj-query`}
              allowClear
              maxLength={80}
              prefix={<SearchOutlined aria-hidden="true" />}
              placeholder="Contoh: Customer atau 18"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                if (validationError) setValidationError(null);
              }}
            />
          </div>
          <div className="pa-filter-field">
            <label htmlFor={`${baseId}-obj-type`}>Jenis objek</label>
            <Select<ObjectTypeFilter>
              id={`${baseId}-obj-type`}
              value={objectType}
              onChange={setObjectType}
              options={OBJECT_TYPE_OPTIONS}
            />
          </div>
          <div className="pa-filter-field">
            <label htmlFor={`${baseId}-obj-access`}>Jenis akses</label>
            <Select<AccessFilter>
              id={`${baseId}-obj-access`}
              value={access}
              onChange={setAccess}
              options={ACCESS_OPTIONS}
            />
          </div>
          <div className="pa-filter-field">
            <label htmlFor={`${baseId}-obj-company`}>Company</label>
            <Select<string>
              id={`${baseId}-obj-company`}
              value={company}
              onChange={setCompany}
              options={companyOptions}
            />
          </div>
        </div>
        <div className="pa-summary-row">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SearchOutlined aria-hidden="true" />}
            loading={state.status === "loading"}
          >
            Cari Akses
          </Button>
          {state.status === "ready" && (
            <span role="status">
              {state.data.totalMatches} hasil ditemukan
              {state.data.truncated ? " (dibatasi maksimal 200 baris)" : ""}
            </span>
          )}
        </div>
      </Form>

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
            description="Masukkan nama atau ID objek lalu klik Cari Akses untuk melihat role dan pemegang izin."
          />
        </div>
      )}

      {state.status === "loading" && (
        <div className="pa-state-box" role="status">
          <Spin />
          <div>Mencari akses objek di Sandbox…</div>
        </div>
      )}

      {state.status === "error" && (
        <Alert type="error" showIcon message={state.message} />
      )}

      {state.status === "ready" && state.data.truncated && (
        <Alert
          type="info"
          showIcon
          message={`Hasil dipotong pada 200 entri pertama dari ${state.data.totalMatches} total kecocokan. Persempit query atau filter.`}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      {state.status === "ready" && state.data.matches.length === 0 && (
        <div
          className="pa-state-box"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Tidak ada izin objek yang cocok dengan kriteria pencarian."
          />
        </div>
      )}

      {state.status === "ready" && state.data.matches.length > 0 && (
        <Table<ObjectAccessMatch>
          rowKey={row => `${row.objectType}|${row.objectId}|${row.roleId}|${row.scope ?? ""}`}
          columns={columns}
          dataSource={state.data.matches}
          size="middle"
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 20, showSizeChanger: true, hideOnSinglePage: true }}
        />
      )}
    </div>
  );
}
