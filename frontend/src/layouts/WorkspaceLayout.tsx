import {
  AppstoreOutlined,
  DatabaseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Segmented, Typography, theme } from "antd";
import { useRef, useState, type CSSProperties } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const themeOptions: { label: string; value: ThemeChoice }[] = [
  { label: "Sistem", value: "system" },
  { label: "Terang", value: "light" },
  { label: "Gelap", value: "dark" },
];

interface WorkspaceLayoutProps {
  choice: ThemeChoice;
  onThemeChange: (choice: ThemeChoice) => void;
}

export function WorkspaceLayout({ choice, onThemeChange }: WorkspaceLayoutProps) {
  const { token } = theme.useToken();
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 991px)").matches);
  const [collapsed, setCollapsed] = useState(narrow);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const colors = {
    "--workspace-page": token.colorBgLayout,
    "--workspace-surface": token.colorBgContainer,
    "--workspace-line": token.colorBorderSecondary,
    "--workspace-text": token.colorText,
    "--workspace-muted": token.colorTextSecondary,
    "--workspace-accent": token.colorPrimary,
    "--workspace-accent-bg": token.colorPrimaryBg,
    "--workspace-focus": token.colorPrimaryBorderHover,
  } as CSSProperties;

  function closeMenu() {
    setCollapsed(true);
    menuToggle.current?.focus();
  }

  return (
    <Layout
      className="workspace"
      hasSider
      style={colors}
      onKeyDown={(event) => {
        if (event.key === "Escape" && narrow && !collapsed) closeMenu();
      }}
    >
      <Layout.Sider
        className="workspace-sider"
        breakpoint="lg"
        collapsed={collapsed}
        collapsedWidth={0}
        onBreakpoint={setNarrow}
        onCollapse={(value, type) => {
          if (type === "responsive") setCollapsed(value);
        }}
        trigger={null}
        width={232}
        theme="dark"
      >
        <div className="workspace-brand" aria-hidden={collapsed}>
          <span className="workspace-brand-mark" aria-hidden="true"><AppstoreOutlined /></span>
          <span>BC Tools</span>
        </div>
        <nav id="workspace-nav" aria-label="Navigasi utama" inert={collapsed}>
          <Menu
            className="workspace-nav"
            theme="dark"
            mode="inline"
            selectedKeys={["overview"]}
            items={[
              {
                key: "overview",
                icon: <AppstoreOutlined aria-hidden="true" />,
                label: <a href="#ringkasan" aria-current="page" onClick={() => {
                  if (narrow) closeMenu();
                }}>Ringkasan</a>,
              },
            ]}
          />
        </nav>
      </Layout.Sider>
      <Layout className="workspace-body">
        <Layout.Header className="workspace-header">
          <div className="workspace-location">
            <Button
              ref={menuToggle}
              aria-controls="workspace-nav"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Buka menu" : "Tutup menu"}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              type="text"
            />
            <Breadcrumb items={[{ title: "Ruang kerja" }, { title: "Ringkasan" }]} />
          </div>
          <Segmented<ThemeChoice>
            aria-label="Tema tampilan"
            name="tema-tampilan"
            onChange={onThemeChange}
            options={themeOptions}
            size="small"
            value={choice}
          />
        </Layout.Header>
        {narrow && !collapsed && (
          <div className="workspace-scrim" aria-hidden="true" onClick={closeMenu} />
        )}
        <Layout.Content className="workspace-content" id="ringkasan">
          <section className="workspace-overview" aria-labelledby="workspace-title">
            <div className="workspace-heading">
              <Typography.Title className="workspace-title" id="workspace-title" level={1}>
                Business Central Sandbox
              </Typography.Title>
              <Typography.Text type="secondary">
                Ringkasan akses data Business Central untuk ruang kerja lokal.
              </Typography.Text>
            </div>
            <section className="workspace-panel" aria-labelledby="workspace-access">
              <div className="workspace-panel-heading">
                <span className="workspace-panel-icon" aria-hidden="true"><DatabaseOutlined /></span>
                <Typography.Title className="workspace-panel-title" id="workspace-access" level={2}>
                  Ruang lingkup akses
                </Typography.Title>
              </div>
              <dl className="workspace-scope">
                <div><dt>Environment</dt><dd>Sandbox</dd></div>
                <div><dt>Company</dt><dd>DEMO COMPANY</dd></div>
                <div><dt>Mode akses</dt><dd>Read-only</dd></div>
              </dl>
              <div className="workspace-resources">
                <p>Resource SDK</p>
                <ul aria-label="Resource SDK">
                  <li>Companies</li>
                  <li>Customers</li>
                  <li>Items</li>
                </ul>
              </div>
            </section>
          </section>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
