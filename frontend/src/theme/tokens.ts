import { theme, type ThemeConfig } from "antd";

const palettes = {
  light: {
    page: "#F4F0E7",
    chrome: "#EAE4D8",
    text: "#29251F",
    muted: "#5E574A",
    line: "#C8BDA8",
    accent: "#79501A",
    selected: "#E4D4B5",
  },
  dark: {
    page: "#201E1B",
    chrome: "#282520",
    text: "#F3ECE1",
    muted: "#C2B8A8",
    line: "#50483B",
    accent: "#E8B65D",
    selected: "#463920",
  },
};

export const recordFont = '"Cascadia Mono", Consolas, monospace';

export function workspaceTheme(dark: boolean): ThemeConfig {
  const palette = dark ? palettes.dark : palettes.light;

  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      borderRadius: 6,
      colorPrimary: palette.accent,
      colorPrimaryBg: palette.selected,
      colorPrimaryBorderHover: palette.accent,
      colorBgLayout: palette.page,
      colorBgContainer: palette.chrome,
      colorBorderSecondary: palette.line,
      colorTextBase: palette.text,
      colorText: palette.text,
      colorTextSecondary: palette.muted,
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      motion: false,
    },
    components: {
      Layout: {
        headerBg: palette.chrome,
        headerPadding: 0,
        siderBg: palette.chrome,
      },
      Dropdown: {
        controlHeight: 44,
        colorBgElevated: palette.chrome,
        controlItemBgHover: palette.page,
        controlItemBgActive: palette.selected,
        controlItemBgActiveHover: palette.selected,
      },
    },
  };
}
