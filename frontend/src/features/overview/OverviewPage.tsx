import { ApiOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import createClient from "openapi-fetch";
import { useEffect, useRef, useState } from "react";
import type { paths } from "../../api/schema";
import { PageHeader } from "../../components/PageHeader";
import {
  loadCatalog,
  loadCustomCatalog,
  loadCustomerPreview,
  loadItemPreview,
} from "../api-explorer/catalog";

export type ServiceStatus =
  | { state: "loading" }
  | { state: "ok" }
  | { state: "error"; message: string };

export type CatalogCountStatus =
  | { state: "loading" }
  | { state: "ready"; count: number }
  | { state: "error"; message: string };

export type DemoCountStatus =
  | { state: "loading" }
  | { state: "ready"; total: number | null; note?: string }
  | { state: "error"; message: string };

export interface OverviewStatus {
  backend: ServiceStatus;
  standardCatalog: CatalogCountStatus;
  customCatalog: CatalogCountStatus;
  customers: DemoCountStatus;
  items: DemoCountStatus;
}

export const INITIAL_OVERVIEW_STATUS: OverviewStatus = {
  backend: { state: "loading" },
  standardCatalog: { state: "loading" },
  customCatalog: { state: "loading" },
  customers: { state: "loading" },
  items: { state: "loading" },
};

const SDK_CAPABILITIES = [
  { name: "Companies", description: "Daftar company pada sandbox" },
  { name: "Customers", description: "Data pelanggan DEMO COMPANY" },
  { name: "Items", description: "Katalog item DEMO COMPANY" },
  { name: "Metadata", description: "Katalog endpoint standar BC" },
  { name: "Custom Metadata", description: "Katalog API custom terkonfigurasi" },
] as const;

const api = createClient<paths>();

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && !(reason instanceof TypeError) && reason.message
    ? reason.message
    : fallback;
}

async function checkHealth(signal: AbortSignal, client = api): Promise<ServiceStatus> {
  try {
    const { data, error, response } = await client.GET("/api/v1/health", { signal });
    if (response.ok && data?.status === "ok") return { state: "ok" };
    const detail = (error as { error?: { message?: string } } | undefined)?.error?.message;
    return {
      state: "error",
      message: detail || "Backend lokal tidak merespons.",
    };
  } catch (reason) {
    return { state: "error", message: errorMessage(reason, "Backend lokal tidak terjangkau.") };
  }
}

async function fetchCount(
  loader: typeof loadCustomerPreview,
  signal: AbortSignal,
  client = api,
): Promise<DemoCountStatus> {
  let total: number | null = null;
  try {
    await loader(signal, { limit: 1, fields: "id", count: true }, client, value => {
      total = value;
    });
    return total === null
      ? { state: "ready", total: null, note: "Jumlah belum tersedia" }
      : { state: "ready", total };
  } catch (reason) {
    return { state: "error", message: errorMessage(reason, "Data DEMO COMPANY gagal dimuat.") };
  }
}

export async function loadOverviewStatus(
  signal: AbortSignal,
  client = api,
): Promise<OverviewStatus> {
  const [backend, standardResult, customResult, customers, items] = await Promise.all([
    checkHealth(signal, client),
    loadCatalog(signal, client).then(
      (list): CatalogCountStatus => ({ state: "ready", count: list.length }),
      (reason): CatalogCountStatus => ({
        state: "error",
        message: errorMessage(reason, "Katalog standar gagal dimuat."),
      }),
    ),
    loadCustomCatalog(signal, client).then(
      (list): CatalogCountStatus => ({ state: "ready", count: list.length }),
      (reason): CatalogCountStatus => ({
        state: "error",
        message: errorMessage(reason, "Katalog custom gagal dimuat."),
      }),
    ),
    fetchCount(loadCustomerPreview, signal, client),
    fetchCount(loadItemPreview, signal, client),
  ]);

  return {
    backend,
    standardCatalog: standardResult,
    customCatalog: customResult,
    customers,
    items,
  };
}

function formatBackend(status: ServiceStatus): { text: string; tone: string; note?: string } {
  if (status.state === "loading") return { text: "Memeriksa...", tone: "muted" };
  if (status.state === "ok") return { text: "Aktif", tone: "ok" };
  return { text: "Gagal", tone: "error", note: status.message };
}

function formatCatalog(
  status: CatalogCountStatus,
  emptyText?: string,
): { text: string; tone: string; note?: string } {
  if (status.state === "loading") return { text: "Memeriksa...", tone: "muted" };
  if (status.state === "error") return { text: "Gagal", tone: "error", note: status.message };
  if (status.count === 0 && emptyText) return { text: emptyText, tone: "muted" };
  return { text: `${status.count} endpoint`, tone: "ok" };
}

function formatDemoCount(status: DemoCountStatus): { text: string; tone: string; note?: string } {
  if (status.state === "loading") return { text: "Memeriksa...", tone: "muted" };
  if (status.state === "error") return { text: "—", tone: "error", note: status.message };
  if (status.total === null) return { text: "—", tone: "muted", note: status.note };
  return { text: String(status.total), tone: "ok" };
}

export function OverviewPage({ initialStatus = INITIAL_OVERVIEW_STATUS }: { initialStatus?: OverviewStatus }) {
  const [status, setStatus] = useState<OverviewStatus>(initialStatus);
  const [refreshing, setRefreshing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  async function refresh() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    setStatus(INITIAL_OVERVIEW_STATUS);
    try {
      const next = await loadOverviewStatus(controller.signal);
      if (!controller.signal.aborted) setStatus(next);
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, []);

  const cards = [
    { label: "Backend lokal", ...formatBackend(status.backend) },
    { label: "Katalog Standar", ...formatCatalog(status.standardCatalog) },
    { label: "Katalog Custom", ...formatCatalog(status.customCatalog, "Belum dikonfigurasi") },
    { label: "Customer (DEMO COMPANY)", ...formatDemoCount(status.customers) },
    { label: "Item (DEMO COMPANY)", ...formatDemoCount(status.items) },
  ];

  return (
    <section className="workspace-sheet overview" aria-labelledby="workspace-title">
      <PageHeader
        title="Business Central Sandbox"
        description="Status koneksi lokal, ringkasan DEMO COMPANY, dan resource SDK."
        titleId="workspace-title"
      />
      <div className="overview-actions">
        <Button type="primary" href="#api-explorer" icon={<ApiOutlined aria-hidden="true" />}>
          Buka API Explorer
        </Button>
        <Button
          icon={<ReloadOutlined aria-hidden="true" />}
          loading={refreshing}
          onClick={() => void refresh()}
          aria-label="Periksa ulang status workspace"
        >
          Periksa ulang
        </Button>
      </div>
      <dl className="workspace-scope" aria-label="Cakupan workspace">
        <div><dt>Environment</dt><dd>Sandbox</dd></div>
        <div><dt>Company</dt><dd>DEMO COMPANY</dd></div>
        <div><dt>Akses</dt><dd>Read-only</dd></div>
      </dl>
      <section className="overview-status-section" aria-labelledby="overview-status-heading">
        <h2 id="overview-status-heading" className="overview-section-title">Status &amp; Ringkasan</h2>
        <div
          className="overview-grid"
          role="status"
          aria-live="polite"
          aria-busy={refreshing}
          aria-label="Status koneksi dan ringkasan DEMO COMPANY"
        >
          {cards.map(({ label, text, tone, note }) => (
            <article key={label} className="overview-card">
              <span className="overview-card-label">{label}</span>
              <strong className="overview-card-value" data-tone={tone}>{text}</strong>
              {note && <span className="overview-card-note">{note}</span>}
            </article>
          ))}
        </div>
      </section>
      <section className="workspace-index" aria-labelledby="workspace-resources">
        <h2 id="workspace-resources">Resource bc_sdk</h2>
        <ul>
          {SDK_CAPABILITIES.map(({ name, description }) => (
            <li key={name}>
              <span>{name}</span>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
