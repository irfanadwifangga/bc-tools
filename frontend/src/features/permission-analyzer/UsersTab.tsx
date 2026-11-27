import { Button, Empty, Input, Select, Switch, Table, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { useId, useMemo, useState } from "react";
import {
  filterUsers,
  type PrincipalFilter,
  type UserPermissionSummary,
  type UserRoleAssignment,
} from "./api";
import { buildRoleColumns, PrincipalTag, roleRowKey, SensitiveTag, UserStateBadge } from "./PermissionBadges";

interface UsersTabProps {
  users: UserPermissionSummary[];
  companies: string[];
  defaultExpandAll?: boolean;
}

export function UsersTab({ users, companies, defaultExpandAll = false }: UsersTabProps) {
  const { token } = theme.useToken();
  const baseId = useId();
  const [search, setSearch] = useState("");
  const [principalType, setPrincipalType] = useState<PrincipalFilter>("all");
  const [company, setCompany] = useState("");
  const [onlySuper, setOnlySuper] = useState(false);

  const filtered = useMemo(
    () => filterUsers(users, { search, principalType, company, onlySuper }),
    [users, search, principalType, company, onlySuper],
  );

  const hasFilters = Boolean(search.trim() || principalType !== "all" || company || onlySuper);

  const columns: ColumnsType<UserPermissionSummary> = [
    {
      title: "User / Aplikasi",
      key: "user",
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.fullName?.trim() || record.userName}</Typography.Text>
          <div>
            <Typography.Text type="secondary" className="pa-mono">
              {record.userName}
            </Typography.Text>
            {record.licenseType && (
              <Typography.Text type="secondary"> · {record.licenseType}</Typography.Text>
            )}
          </div>
          {record.applicationId && (
            <div>
              <Typography.Text type="secondary" className="pa-mono">
                App ID: {record.applicationId}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Jenis",
      dataIndex: "principalType",
      key: "principalType",
      width: 140,
      render: (value: UserPermissionSummary["principalType"]) => <PrincipalTag type={value} />,
    },
    {
      title: "Status",
      dataIndex: "state",
      key: "state",
      width: 120,
      render: (value?: string | null) => <UserStateBadge state={value} />,
    },
    {
      title: "Sensitif",
      dataIndex: "isSuper",
      key: "isSuper",
      width: 110,
      render: (value: boolean) => <SensitiveTag isSuper={value} />,
    },
    {
      title: "Permission Set",
      key: "assignments",
      render: (_, record) =>
        record.assignments.length === 0 ? (
          <Typography.Text type="secondary">Tidak ada</Typography.Text>
        ) : (
          <span className="pa-perms-strip">
            {record.assignments.slice(0, 4).map((item, idx) => (
              <Tag
                key={`${item.roleId}-${item.company ?? ""}-${idx}`}
                color={item.roleId === "SUPER" ? "error" : undefined}
              >
                {item.roleId}
              </Tag>
            ))}
            {record.assignments.length > 4 && (
              <Tag>+{record.assignments.length - 4} lainnya</Tag>
            )}
          </span>
        ),
    },
  ];

  const companyOptions = [
    { value: "", label: "Semua company" },
    ...companies.map(name => ({ value: name, label: name })),
  ];

  return (
    <div>
      <div className="pa-filter-bar">
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-search`}>Cari user atau role</label>
          <Input
            id={`${baseId}-search`}
            type="search"
            allowClear
            prefix={<SearchOutlined aria-hidden="true" />}
            placeholder="Nama, username, roleId, atau security group"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-principal`}>Jenis</label>
          <Select<PrincipalFilter>
            id={`${baseId}-principal`}
            value={principalType}
            onChange={setPrincipalType}
            options={[
              { value: "all", label: "Semua" },
              { value: "user", label: "User BC" },
              { value: "application", label: "Aplikasi Entra" },
            ]}
          />
        </div>
        <div className="pa-filter-field">
          <label htmlFor={`${baseId}-company`}>Company</label>
          <Select<string>
            id={`${baseId}-company`}
            value={company}
            onChange={setCompany}
            options={companyOptions}
          />
        </div>
        <div className="pa-filter-field">
          <span className="pa-filter-label" id={`${baseId}-super-label`}>
            Hanya sensitif
          </span>
          <div className="pa-switch-field">
            <Switch
              checked={onlySuper}
              onChange={setOnlySuper}
              aria-labelledby={`${baseId}-super-label`}
            />
            <span>SUPER</span>
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="pa-summary-row" role="status">
          <span>
            {filtered.length === 0
              ? `Menampilkan 0 dari ${users.length} akun`
              : `${filtered.length} dari ${users.length} akun cocok`}
          </span>
          <Button
            size="small"
            onClick={() => {
              setSearch("");
              setPrincipalType("all");
              setCompany("");
              setOnlySuper(false);
            }}
          >
            Reset filter
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="pa-state-box"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              users.length === 0
                ? "Belum ada data user atau aplikasi di Sandbox."
                : "Tidak ada user atau aplikasi yang cocok dengan filter."
            }
          />
        </div>
      ) : (
        <Table<UserPermissionSummary>
          rowKey="userSecurityId"
          columns={columns}
          dataSource={filtered}
          size="middle"
          scroll={{ x: 720 }}
          pagination={{
            defaultPageSize: 15,
            showSizeChanger: true,
            showTotal: total => `Menampilkan ${total} dari ${users.length} akun`,
          }}
          expandable={{
            defaultExpandAllRows: defaultExpandAll,
            rowExpandable: record => record.assignments.length > 0,
            expandedRowRender: record => (
              <Table<UserRoleAssignment>
                rowKey={roleRowKey}
                columns={buildRoleColumns(record.assignments)}
                dataSource={record.assignments}
                size="small"
                pagination={false}
                scroll={{ x: 560 }}
              />
            ),
          }}
        />
      )}
    </div>
  );
}
