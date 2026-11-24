import { theme, type ThemeConfig } from "antd";

export function workspaceTheme(dark: boolean): ThemeConfig {
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      borderRadius: 8,
      colorPrimary: dark ? "#58c9b8" : "#14786f",
      colorBgLayout: dark ? "#111b29" : "#f4f7fa",
      colorBgContainer: dark ? "#192637" : "#ffffff",
      colorTextBase: dark ? "#eef5fb" : "#14283b",
      fontFamily: '"Segoe UI", sans-serif',
      motion: false,
    },
    components: {
      Layout: { siderBg: "#14283b" },
      Menu: {
        darkItemBg: "transparent",
        darkItemColor: "#d1deea",
        darkItemHoverBg: "#1c374f",
        darkItemSelectedBg: "#215052",
        darkItemSelectedColor: "#ffffff",
      },
    },
  };
}
