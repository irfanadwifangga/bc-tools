import { CheckOutlined, CopyOutlined, LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import type { PreviewCustomer } from "./catalog";

export type PreviewFormat = "Tabel" | "JSON";

export function JsonCode({ text }: { text: string }) {
  // The capture keeps every token in place; unstyled parts retain the original whitespace.
  const parts = text.split(/("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/g);
  return <code>{parts.map((token, index) => {
    if (index % 2 === 0) return token;
    let kind = "literal";
    if (token.startsWith('"')) {
      kind = parts[index + 1].startsWith(":") ? "key" : "string";
    }
    return <span key={index} className={`json-${kind}`}>{token}</span>;
  })}</code>;
}

const copyStates = {
  idle: { label: "Salin JSON", icon: CopyOutlined },
  copying: { label: "Menyalin…", icon: LoadingOutlined },
  copied: { label: "Tersalin", icon: CheckOutlined },
  error: { label: "Coba salin lagi", icon: ReloadOutlined },
};

function JsonPreview({ text }: { text: string }) {
  const [status, setStatus] = useState<keyof typeof copyStates>("idle");
  const { label, icon: Icon } = copyStates[status];
  const busy = status === "copying" || status === "copied";

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copyJson() {
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
      <button className="preview-copy" type="button" onClick={copyJson} aria-disabled={busy}>
        <Icon aria-hidden="true" />
        <span aria-live="polite" aria-atomic="true">{label}</span>
      </button>
      {status === "error" && (
        <p className="preview-copy-error" role="alert">Gagal menyalin. Kamu juga bisa menyalin teks JSON secara manual.</p>
      )}
      <pre className="preview-json"><JsonCode text={text} /></pre>
    </>
  );
}

export function CustomerPreviewData({ rows, format }: {
  rows: PreviewCustomer[];
  format: PreviewFormat;
}) {
  if (format === "JSON") {
    return <JsonPreview text={JSON.stringify(rows, null, 2)} />;
  }
  if (rows.length === 0) return null;

  return (
    <table aria-label="Contoh data customer">
      <thead><tr><th scope="col">id</th><th scope="col">number</th><th scope="col">displayName</th></tr></thead>
      <tbody>{rows.map(row => (
        <tr key={row.id}><td>{row.id}</td><td>{row.number}</td><td>{row.displayName}</td></tr>
      ))}</tbody>
    </table>
  );
}
