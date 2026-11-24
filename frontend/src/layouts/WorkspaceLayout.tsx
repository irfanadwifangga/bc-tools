import {
  CheckOutlined,
  DesktopOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Dropdown, Layout, Tooltip, theme } from "antd";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { recordFont } from "../theme/tokens";

export type ThemeChoice = "system" | "light" | "dark";

const themeOptions = {
  system: { label: "Sistem", icon: DesktopOutlined },
  light: { label: "Terang", icon: SunOutlined },
  dark: { label: "Gelap", icon: MoonOutlined },
};

const resources = [
  { name: "Companies", description: "Daftar company di sandbox" },
  { name: "Customers", description: "Pelanggan demo company" },
  { name: "Items", description: "Katalog item demo company" },
];

interface WorkspaceLayoutProps {
  choice: ThemeChoice;
  onThemeChange: (choice: ThemeChoice) => void;
}

export function WorkspaceLayout({ choice, onThemeChange }: WorkspaceLayoutProps) {
  const { token } = theme.useToken();
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 991.98px)").matches,
  );
  const [collapsed, setCollapsed] = useState(narrow);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const themeToggle = useRef<HTMLButtonElement>(null);
  const ActiveThemeIcon = themeOptions[choice].icon;
  const overviewLink = useRef<HTMLAnchorElement>(null);
  const mobileMenuOpen = narrow && !collapsed;
  const styles = {
    "--workspace-page": token.colorBgLayout,
    "--workspace-chrome": token.colorBgContainer,
    "--workspace-line": token.colorBorderSecondary,
    "--workspace-text": token.colorText,
    "--workspace-muted": token.colorTextSecondary,
    "--workspace-accent": token.colorPrimary,
    "--workspace-selection": token.colorPrimaryBg,
    "--workspace-record-font": recordFont,
  } as CSSProperties;

  useEffect(() => {
    if (mobileMenuOpen) overviewLink.current?.focus();
  }, [mobileMenuOpen]);

  function closeMenu() {
    setCollapsed(true);
    menuToggle.current?.focus();
  }

  function selectTheme(key: string) {
    if (key !== "system" && key !== "light" && key !== "dark") return;
    onThemeChange(key);
    setThemeMenuOpen(false);
    themeToggle.current?.focus();
  }

  return (
    <Layout
      className="workspace"
      style={styles}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileMenuOpen) closeMenu();
      }}
    >
      <Layout.Header className="workspace-header">
        <div className="workspace-location">
          <Button
            className="workspace-menu-toggle"
            ref={menuToggle}
            aria-controls="workspace-nav"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Buka menu" : "Tutup menu"}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((current) => !current)}
            type="text"
          />
          <span className="workspace-brand">BC Tools</span>
          <Breadcrumb
            className="workspace-breadcrumb"
            items={[{ title: "Ruang kerja" }, { title: "Ringkasan" }]}
          />
        </div>
        <Dropdown
          autoFocus
          menu={{
            selectable: true,
            selectedKeys: [choice],
            onClick: ({ key, domEvent }) => {
              if (domEvent.type === "keydown") domEvent.preventDefault();
              selectTheme(key);
            },
            items: Object.entries(themeOptions).map(([key, { label, icon: ThemeIcon }]) => ({
              key,
              role: "menuitemradio",
              "aria-checked": key === choice,
              icon: <ThemeIcon aria-hidden="true" />,
              label: (
                <span className="workspace-theme-option">
                  {label}
                  {key === choice && <CheckOutlined aria-hidden="true" />}
                </span>
              ),
            })),
          }}
          open={themeMenuOpen}
          onOpenChange={setThemeMenuOpen}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            className="workspace-theme-toggle"
            ref={themeToggle}
            type="text"
            icon={<ActiveThemeIcon aria-hidden="true" />}
            title="Tema tampilan"
            aria-label={`Tema tampilan, ${themeOptions[choice].label}`}
            aria-haspopup="menu"
            aria-expanded={themeMenuOpen}
          />
        </Dropdown>
      </Layout.Header>
      <Layout className="workspace-body" hasSider>
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
          width={narrow ? 224 : 56}
        >
          <nav id="workspace-nav" aria-label="Navigasi utama" inert={collapsed}>
            <Tooltip placement="right" title={narrow ? undefined : "Ringkasan"}>
              <a
                className="workspace-nav-link"
                ref={overviewLink}
                href="#ringkasan"
                aria-current="page"
                aria-label="Ringkasan"
                onClick={() => {
                  if (mobileMenuOpen) closeMenu();
                }}
              >
                <UnorderedListOutlined aria-hidden="true" />
                {narrow && <span>Ringkasan</span>}
              </a>
            </Tooltip>
          </nav>
        </Layout.Sider>
        {mobileMenuOpen && (
          <div className="workspace-scrim" aria-hidden="true" onClick={closeMenu} />
        )}
        <Layout.Content className="workspace-content" id="ringkasan" inert={mobileMenuOpen}>
          <section className="workspace-sheet" aria-labelledby="workspace-title">
            <h1 className="workspace-title" id="workspace-title">Business Central Sandbox</h1>
            <dl className="workspace-scope">
              <div><dt>Environment</dt><dd>Sandbox</dd></div>
              <div><dt>Company</dt><dd>DEMO COMPANY</dd></div>
              <div><dt>Akses</dt><dd>Read-only</dd></div>
            </dl>
            <section className="workspace-index" aria-labelledby="workspace-resources">
              <h2 id="workspace-resources">Resource SDK</h2>
              <ul>
                {resources.map(({ name, description }) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span>{description}</span>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
