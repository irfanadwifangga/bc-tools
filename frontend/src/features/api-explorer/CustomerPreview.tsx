import { Button } from "antd";
import { useEffect, useId, useRef, useState } from "react";
import { loadCustomerPreview, type PreviewCustomer } from "./catalog";

type PreviewState =
  | { status: "idle" | "loading" }
  | { status: "ready"; rows: PreviewCustomer[] }
  | { status: "error"; message: string };

export function CustomerPreview() {
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);
  const resultId = useId();
  useEffect(() => () => request.current?.abort(), []);

  async function togglePreview() {
    if (request.current) return;
    if (preview.status === "ready") {
      setPreview({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPreview({ status: "loading" });
    try {
      const rows = await loadCustomerPreview(controller.signal);
      if (!controller.signal.aborted) setPreview({ status: "ready", rows });
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message = reason instanceof Error && !(reason instanceof TypeError)
          ? reason.message : "Contoh data gagal dimuat. Periksa backend lokal.";
        setPreview({ status: "error", message });
      }
    } finally {
      request.current = null;
    }
  }

  const label = preview.status === "error" ? "Coba lagi"
    : preview.status === "ready" ? "Sembunyikan contoh data" : "Lihat contoh data";
  return (
    <div className="customer-preview">
      <Button onClick={togglePreview} aria-controls={resultId}
        aria-expanded={preview.status !== "idle"} aria-disabled={preview.status === "loading"}>
        {label}
      </Button>
      <div id={resultId}>
        <div role="status">
          {preview.status === "loading" && "Memuat contoh data…"}
          {preview.status === "ready" && (preview.rows.length
            ? `${preview.rows.length} customer ditampilkan.` : "Demo company ini belum memiliki customer.")}
        </div>
        {preview.status === "error" && <p role="alert">{preview.message}</p>}
        {preview.status === "ready" && preview.rows.length > 0 && (
          <table aria-label="Contoh data customer">
            <thead><tr><th scope="col">id</th><th scope="col">number</th><th scope="col">displayName</th></tr></thead>
            <tbody>{preview.rows.map(row => (
              <tr key={row.id}><td>{row.id}</td><td>{row.number}</td><td>{row.displayName}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
