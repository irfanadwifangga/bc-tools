import { Alert, Button, Empty, Input, Select, Spin } from "antd";
import {
  AppstoreOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  OrderedListOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { useEffect, useId, useRef, useState } from "react";
import { CustomerPreviewData, type PreviewFormat } from "./CustomerPreviewData";
import {
  loadCustomerPreview, loadItemPreview, PREVIEW_FIELDS, selectedPreviewFields,
  type PreviewCustomer, type PreviewField, type PreviewOrder, type PreviewQuery,
} from "./catalog";

const loaders = { customer: loadCustomerPreview, item: loadItemPreview };
const orderOptions: { value: PreviewOrder; label: string }[] = [
  { value: "number asc", label: "Nomor naik" },
  { value: "number desc", label: "Nomor turun" },
  { value: "displayName asc", label: "Nama A–Z" },
  { value: "displayName desc", label: "Nama Z–A" },
];

type PreviewState =
  | { status: "idle" | "loading" }
  | { status: "ready"; rows: PreviewCustomer[]; totalCount: number | null }
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
      let totalCount: number | null = null;
      const rows = await loaders[resource](
        controller.signal,
        {
          ...query,
          number: query.number?.trim() ? query.number : undefined,
          name: query.name?.trim() ? query.name : undefined,
          count: query.count ? true : undefined,
        },
        undefined,
        total => { totalCount = total; },
      );
      if (!controller.signal.aborted) setPreview({ status: "ready", rows, totalCount });
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
  const selectedFields = selectedPreviewFields(query.fields);
  const emptyMessage = query.name?.trim()
    ? "Tidak ada hasil untuk filter ini."
    : query.number?.trim()
      ? "Tidak ada hasil untuk nomor ini."
      : `Demo company ini belum memiliki ${resource}.`;

  function toggleField(field: PreviewField) {
    const active = selectedFields.includes(field);
    if (active && selectedFields.length === 1) return;
    const next = active
      ? selectedFields.filter(item => item !== field)
      : PREVIEW_FIELDS.filter(item => item === field || selectedFields.includes(item));
    onQueryChange({
      ...query,
      fields: next.length === PREVIEW_FIELDS.length ? undefined : next.join(","),
    });
  }

  return (
    <div className="customer-preview">
      <div className="preview-toolbar">
        <div className="preview-controls-row">
          <div className="preview-field">
            <label htmlFor={resultId + "-limit"}><OrderedListOutlined aria-hidden="true" /><span>Jumlah baris</span></label>
            <Select<number> id={resultId + "-limit"} className="preview-limit" value={query.limit}
              disabled={settingsLocked}
              onChange={limit => onQueryChange({ ...query, limit })}
              options={[1, 2, 3, 4, 5].map(value => ({ value, label: String(value) }))} />
          </div>
          <div className="preview-field">
            <label htmlFor={resultId + "-order"}><SortAscendingOutlined aria-hidden="true" /><span>Urutkan</span></label>
            <Select<PreviewOrder | ""> id={resultId + "-order"} className="preview-order" value={query.order ?? ""}
              disabled={settingsLocked}
              onChange={value => onQueryChange({ ...query, order: value || undefined })}
              options={[{ value: "", label: "Urutan BC" }, ...orderOptions]} />
          </div>
          <div className="preview-field">
            <label htmlFor={resultId + "-number"}><FilterOutlined aria-hidden="true" /><span>Nomor</span></label>
            <Input id={resultId + "-number"} className="preview-number" placeholder="Opsional" allowClear
              prefix={<FilterOutlined aria-hidden="true" />}
              value={query.number ?? ""} maxLength={100} disabled={settingsLocked}
              onChange={event => onQueryChange({ ...query, number: event.target.value })} />
          </div>
          <div className="preview-field">
            <label htmlFor={resultId + "-name"}><SearchOutlined aria-hidden="true" /><span>Nama</span></label>
            <Input id={resultId + "-name"} className="preview-name" placeholder="Opsional" allowClear
              prefix={<SearchOutlined aria-hidden="true" />}
              value={query.name ?? ""} maxLength={100} disabled={settingsLocked}
              onChange={event => onQueryChange({ ...query, name: event.target.value })} />
          </div>
        </div>
        <div className="preview-actions-row">
          <div className="preview-field">
            <span className="preview-field-label" id={resultId + "-fields-label"}>
              <AppstoreOutlined aria-hidden="true" /><span>Field ($select)</span>
            </span>
            <div className="preview-select-fields" role="group" aria-labelledby={resultId + "-fields-label"}>
              {PREVIEW_FIELDS.map(field => {
                const active = selectedFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    aria-pressed={active}
                    disabled={settingsLocked || (active && selectedFields.length === 1)}
                    onClick={() => toggleField(field)}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="preview-count-toggle"
            aria-pressed={Boolean(query.count)}
            disabled={settingsLocked}
            onClick={() => onQueryChange({ ...query, count: query.count ? undefined : true })}
          >
            Jumlah total ($count)
          </button>
          <Button
            type={preview.status === "ready" ? "default" : "primary"}
            icon={
              preview.status === "ready" ? <EyeInvisibleOutlined aria-hidden="true" />
                : preview.status === "error" ? <ReloadOutlined aria-hidden="true" />
                  : <EyeOutlined aria-hidden="true" />
            }
            loading={preview.status === "loading"}
            onClick={togglePreview}
            aria-controls={resultId}
            aria-expanded={preview.status !== "idle"}
          >
            {label}
          </Button>
        </div>
      </div>
      <div id={resultId}>
        {preview.status === "loading" && (
          <div className="preview-state" role="status">
            <Spin size="small" />
            <span>Memuat contoh data…</span>
          </div>
        )}
        {preview.status === "ready" && (preview.rows.length > 0 || preview.totalCount !== null) && (
          <div className="preview-status" role="status">
            {preview.totalCount !== null
              ? `${preview.rows.length} ditampilkan dari ${preview.totalCount} total`
              : `${preview.rows.length} ${resource} ditampilkan.`}
          </div>
        )}
        {preview.status === "error" && (
          <div className="preview-state">
            <Alert type="error" showIcon message={preview.message} />
          </div>
        )}
        {preview.status === "ready" && (
          <div className="preview-panel">
            <div role="group" aria-label="Tampilan contoh data" className="preview-formats">
              {(["Tabel", "JSON"] as const).map(option => (
                <button key={option} type="button" aria-pressed={format === option}
                  onClick={() => setFormat(option)}>{option}</button>
              ))}
            </div>
            {preview.rows.length === 0 && format === "Tabel"
              ? <div className="preview-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyMessage} /></div>
              : <CustomerPreviewData rows={preview.rows} format={format} resource={resource} fields={selectedFields} />}
          </div>
        )}
      </div>
    </div>
  );
}
