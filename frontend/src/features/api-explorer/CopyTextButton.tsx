import { CheckOutlined, CopyOutlined, LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
const copyStates = {
  idle: { label: "", icon: CopyOutlined },
  copying: { label: "Menyalin…", icon: LoadingOutlined },
  copied: { label: "Tersalin", icon: CheckOutlined },
  error: { label: "Coba salin lagi", icon: ReloadOutlined },
};

export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<keyof typeof copyStates>("idle");
  const { label: feedback, icon: Icon } = copyStates[status];
  const busy = status === "copying" || status === "copied";

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copyText() {
    if (busy) return;
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button className="preview-copy" type="button" onClick={copyText} aria-disabled={busy}>
        <Icon aria-hidden="true" />
        <span aria-live="polite" aria-atomic="true">{feedback || label}</span>
      </button>
      {status === "error" && (
        <p className="preview-copy-error" role="alert">Gagal menyalin. Kamu juga bisa menyalin teks secara manual.</p>
      )}
    </>
  );
}
