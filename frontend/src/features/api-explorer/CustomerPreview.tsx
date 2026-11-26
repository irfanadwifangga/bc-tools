import { Button, Input } from "antd";
import { useEffect, useId, useRef, useState } from "react";
import { CustomerPreviewData, type PreviewFormat } from "./CustomerPreviewData";
import { loadCustomerPreview, loadItemPreview, type PreviewCustomer, type PreviewOrder, type PreviewQuery } from "./catalog";

const loaders = { customer: loadCustomerPreview, item: loadItemPreview };
const orderOptions: { value: PreviewOrder; label: string }[] = [
  { value: "number asc", label: "Nomor naik" },
  { value: "number desc", label: "Nomor turun" },
  { value: "displayName asc", label: "Nama A–Z" },
  { value: "displayName desc", label: "Nama Z–A" },
];

type PreviewState =
  | { status: "idle" | "loading" }
  | { status: "ready"; rows: PreviewCustomer[] }
  | { status: "error"; message: string };

export function CustomerPreview({ resource, query, onQueryChange }: {
  resource: keyof typeof loaders;
  query: PreviewQuery;
  onQueryChange: (query: PreviewQuery) => void;
}) {
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [format, setFormat] = useState<PreviewFormat>("Tabel");
  const request = useRef<AbortController | null>(null);
  const resultId = useId();
  useEffect(() => () => request.current?.abort(), []);

  async function togglePreview() {
    if (request.current) return;
    if (preview.status === "ready") {
      setPreview({ status: "idle" });
      setFormat("Tabel");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPreview({ status: "loading" });
    try {
      const rows = await loaders[resource](controller.signal, {
        ...query, number: query.number?.trim() ? query.number : undefined,
      });
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
  const settingsLocked = preview.status === "loading" || preview.status === "ready";
  const emptyMessage = query.number?.trim()
    ? "Tidak ada hasil untuk nomor ini." : `Demo company ini belum memiliki ${resource}.`;
  return (
    <div className="customer-preview">
      <div className="preview-controls">
        <label htmlFor={resultId + "-limit"}>Jumlah baris</label>
        <select id={resultId + "-limit"} value={query.limit}
          disabled={settingsLocked}
          onChange={event => onQueryChange({ ...query, limit: Number(event.target.value) })}>
          {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <label htmlFor={resultId + "-order"}>Urutkan</label>
        <select id={resultId + "-order"} value={query.order ?? ""} disabled={settingsLocked}
          onChange={event => {
            const value = event.target.value;
            onQueryChange({ ...query, order: orderOptions.find(option => option.value === value)?.value });
          }}>
          <option value="">Urutan BC</option>
          {orderOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label htmlFor={resultId + "-number"}>Nomor</label>
        <Input id={resultId + "-number"} className="preview-number" placeholder="Opsional"
          value={query.number ?? ""} maxLength={100} disabled={settingsLocked}
          onChange={event => onQueryChange({ ...query, number: event.target.value })} />
        <Button onClick={togglePreview} aria-controls={resultId}
          aria-expanded={preview.status !== "idle"} aria-disabled={preview.status === "loading"}>
          {label}
        </Button>
      </div>
      <div id={resultId}>
        <div role="status">
          {preview.status === "loading" && "Memuat contoh data…"}
          {preview.status === "ready" && (preview.rows.length
            ? `${preview.rows.length} ${resource} ditampilkan.` : emptyMessage)}
        </div>
        {preview.status === "error" && <p role="alert">{preview.message}</p>}
        {preview.status === "ready" && (
          <div className="preview-panel">
            <div role="group" aria-label="Tampilan contoh data" className="preview-formats">
              {(["Tabel", "JSON"] as const).map(option => (
                <button key={option} type="button" aria-pressed={format === option}
                  onClick={() => setFormat(option)}>{option}</button>
              ))}
            </div>
            <CustomerPreviewData rows={preview.rows} format={format} resource={resource} />
          </div>
        )}
      </div>
    </div>
  );
}
