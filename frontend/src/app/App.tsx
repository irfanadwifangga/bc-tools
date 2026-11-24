import { ConfigProvider } from "antd";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { WorkspaceLayout, type ThemeChoice } from "../layouts/WorkspaceLayout";
import { workspaceTheme } from "../theme/tokens";

const themeKey = "bc-tools-theme";
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function subscribeToSystemTheme(onChange: () => void) {
  systemTheme.addEventListener("change", onChange);
  return () => systemTheme.removeEventListener("change", onChange);
}

function savedTheme(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(themeKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function App() {
  const [choice, setChoice] = useState<ThemeChoice>(savedTheme);
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => systemTheme.matches,
  );
  const dark = choice === "dark" || (choice === "system" && systemDark);
  const theme = useMemo(() => workspaceTheme(dark), [dark]);

  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  function changeTheme(value: ThemeChoice) {
    setChoice(value);
    try {
      window.localStorage.setItem(themeKey, value);
    } catch {
      // Theme selection still works when browser storage is unavailable.
    }
  }

  return (
    <ConfigProvider theme={theme}>
      <WorkspaceLayout choice={choice} onThemeChange={changeTheme} />
    </ConfigProvider>
  );
}
