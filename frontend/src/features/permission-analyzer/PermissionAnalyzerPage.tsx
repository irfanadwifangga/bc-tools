import { Alert, Button, Skeleton, Spin, Tabs, theme } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import {
  loadPermissionUsers,
  type PermissionClient,
  type PermissionUsersResponse,
} from "./api";
import { DiffTab, type DiffState } from "./DiffTab";
import { ObjectSearchTab, type SearchState } from "./ObjectSearchTab";
import { UsersTab } from "./UsersTab";
import "./permission-analyzer.css";

export type UsersPageState =
  | { status: "loading" }
  | { status: "ready"; data: PermissionUsersResponse }
  | { status: "error"; message: string };

interface PermissionAnalyzerPageProps {
  initialUsersState?: UsersPageState;
  initialSearchState?: SearchState;
  initialDiffState?: DiffState;
  defaultExpandUsers?: boolean;
  client?: PermissionClient;
}

export function PermissionAnalyzerPage({
  initialUsersState,
  initialSearchState,
  initialDiffState,
  defaultExpandUsers = false,
  client,
}: PermissionAnalyzerPageProps) {
  const { token } = theme.useToken();
  const [state, setState] = useState<UsersPageState>(
    initialUsersState ?? { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialUsersState && attempt === 0) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });

    loadPermissionUsers(controller.signal, client).then(
      data => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", data });
        }
      },
      reason => {
        if (controller.signal.aborted) return;
        const message =
          reason instanceof Error && !(reason instanceof TypeError) && reason.message
            ? reason.message
            : "Data Permission Analyzer gagal dimuat. Periksa backend lokal.";
        setState({ status: "error", message });
      },
    );

    return () => controller.abort();
  }, [attempt, client, initialUsersState]);

  function retry() {
    setAttempt(value => value + 1);
  }

  const users = state.status === "ready" ? state.data.users : [];
  const permissionSets = state.status === "ready" ? state.data.permissionSets : [];
  const companies = state.status === "ready" ? state.data.companies : [];

  return (
    <section
      className="workspace-sheet permission-analyzer"
      aria-labelledby="permission-analyzer-title"
    >
      <PageHeader
        title="Permission Analyzer"
        description="Audit izin user & aplikasi Entra, cari pemegang akses objek, dan bandingkan role atau user Sandbox."
        titleId="permission-analyzer-title"
      />

      {state.status === "loading" && (
        <div
          className="pa-state-box"
          role="status"
          aria-live="polite"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Spin />
          <div>Memuat data user dan permission set Sandbox…</div>
          <Skeleton active title={false} paragraph={{ rows: 4 }} />
        </div>
      )}

      {state.status === "error" && (
        <Alert
          type="error"
          showIcon
          message={state.message}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined aria-hidden="true" />}
              onClick={retry}
            >
              Coba lagi
            </Button>
          }
          style={{ marginBottom: token.marginLG }}
        />
      )}

      {state.status === "ready" && (
        <Tabs
          defaultActiveKey="users"
          items={[
            {
              key: "users",
              label: "User & Aplikasi",
              forceRender: true,
              children: (
                <UsersTab
                  users={users}
                  companies={companies}
                  defaultExpandAll={defaultExpandUsers}
                />
              ),
            },
            {
              key: "objects",
              label: "Cari Akses Objek",
              forceRender: true,
              children: (
                <ObjectSearchTab
                  companies={companies}
                  client={client}
                  initialState={initialSearchState}
                />
              ),
            },
            {
              key: "diff",
              label: "Bandingkan (Diff)",
              forceRender: true,
              children: (
                <DiffTab
                  users={users}
                  permissionSets={permissionSets}
                  client={client}
                  initialState={initialDiffState}
                />
              ),
            },
          ]}
        />
      )}
    </section>
  );
}
