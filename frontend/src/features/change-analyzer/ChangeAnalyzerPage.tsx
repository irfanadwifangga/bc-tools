import {
  CheckOutlined,
  CloudDownloadOutlined,
  CopyOutlined,
  DiffOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Input,
  Select,
  Skeleton,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import {
  loadSchemaSnapshot,
  type ChangeAnalyzerClient,
  type SchemaSnapshot,
  type SnapshotSource,
  type SnapshotSourceFilter,
} from "./api";
import {
  diffSnapshots,
  formatDiffMarkdown,
  parseSnapshotJson,
  type EndpointChange,
  type FieldChange,
  type SchemaDiffResult,
} from "./diff";
import "./change-analyzer.css";

export type LiveSnapshotState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: SchemaSnapshot }
  | { status: "error"; message: string };

interface ChangeAnalyzerPageProps {
  client?: ChangeAnalyzerClient;
  initialLiveState?: LiveSnapshotState;
  initialBaseline?: SchemaSnapshot | null;
  initialTarget?: SchemaSnapshot | null;
}

const SOURCE_OPTIONS: { value: NonNullable<SnapshotSourceFilter>; label: string }[] = [
  { value: "all", label: "Semua (Standar, Custom, Automation)" },
  { value: "standard", label: "Standar API v2.0" },
  { value: "custom", label: "Custom API" },
  { value: "automation", label: "Automation API v2.0" },
];

const SOURCE_LABELS: Record<SnapshotSource, string> = {
  standard: "Standar",
  custom: "Custom",
  automation: "Automation",
};

function snapshotMetaLabel(snapshot: SchemaSnapshot, fallback: string): string {
  const when = snapshot.capturedAt ? snapshot.capturedAt.slice(0, 19).replace("T", " ") : fallback;
  return `${snapshot.endpoints.length} endpoint · ${when}`;
}

function summarizeChange(item: EndpointChange): string {
  if (item.kind === "removed") return `Endpoint dihapus (${item.fieldChanges.length} field)`;
  if (item.kind === "added") return `Endpoint baru (${item.fieldChanges.length} field)`;
  const parts: string[] = [];
  if (item.entityTypeChanged) parts.push("entityType berubah");
  const removed = item.fieldChanges.filter(f => f.kind === "removed").length;
  const changed = item.fieldChanges.filter(f => f.kind === "type_changed").length;
  const added = item.fieldChanges.filter(f => f.kind === "added").length;
  if (removed > 0) parts.push(`${removed} field dihapus`);
  if (changed > 0) parts.push(`${changed} tipe berubah`);
  if (added > 0) parts.push(`${added} field baru`);
  return parts.join(", ");
}

function downloadSnapshotJson(snapshot: SchemaSnapshot): void {
  const datePart = (snapshot.capturedAt || new Date().toISOString()).slice(0, 10);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bc-schema-snapshot-${datePart}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const fieldColumns: ColumnsType<FieldChange> = [
  {
    title: "Field",
    dataIndex: "name",
    key: "name",
    render: (value: string) => <span className="ca-mono">{value}</span>,
  },
  {
    title: "Perubahan",
    key: "kind",
    width: 150,
    render: (_, row) => {
      if (row.kind === "removed") return <Tag color="error">Dihapus</Tag>;
      if (row.kind === "type_changed") return <Tag color="warning">Tipe Berubah</Tag>;
      return <Tag color="blue">Ditambah</Tag>;
    },
  },
  {
    title: "Tipe Lama",
    dataIndex: "oldType",
    key: "oldType",
    render: (value?: string) => (value ? <span className="ca-mono">{value}</span> : "—"),
  },
  {
    title: "Tipe Baru",
    dataIndex: "newType",
    key: "newType",
    render: (value?: string) => (value ? <span className="ca-mono">{value}</span> : "—"),
  },
];

export function ChangeAnalyzerPage({
  client,
  initialLiveState = { status: "idle" },
  initialBaseline = null,
  initialTarget = null,
}: ChangeAnalyzerPageProps) {
  const { token } = theme.useToken();
  const baseId = useId();
  const [source, setSource] = useState<NonNullable<SnapshotSourceFilter>>("all");
  const [liveState, setLiveState] = useState<LiveSnapshotState>(initialLiveState);
  const [baseline, setBaseline] = useState<SchemaSnapshot | null>(initialBaseline);
  const [target, setTarget] = useState<SchemaSnapshot | null>(
    initialTarget ?? (initialLiveState.status === "ready" ? initialLiveState.data : null),
  );
  const [baselineText, setBaselineText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | SnapshotSource>("all");
  const [onlyBreaking, setOnlyBreaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const requestRef = useRef<AbortController | null>(null);
  const baselineFileRef = useRef<HTMLInputElement | null>(null);
  const targetFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function fetchLive(assignTo: "target" | "baseline" | "download") {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setParseError(null);
    setLiveState({ status: "loading" });

    try {
      const data = await loadSchemaSnapshot(source, controller.signal, client);
      if (controller.signal.aborted) return;
      setLiveState({ status: "ready", data });
      if (assignTo === "baseline") {
        setBaseline(data);
      } else {
        setTarget(data);
      }
      if (assignTo === "download") {
        downloadSnapshotJson(data);
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      const message =
        reason instanceof Error && !(reason instanceof TypeError) && reason.message
          ? reason.message
          : "Snapshot skema Sandbox gagal diambil. Periksa backend lokal.";
      setLiveState({ status: "error", message });
    }
  }

  function applyJsonText(side: "baseline" | "target", raw: string) {
    if (!raw.trim()) {
      setParseError("Tempel isi JSON snapshot terlebih dahulu.");
      return;
    }
    try {
      const parsed = parseSnapshotJson(raw);
      setParseError(null);
      if (side === "baseline") {
        setBaseline(parsed);
      } else {
        setTarget(parsed);
      }
    } catch (reason) {
      setParseError(reason instanceof Error ? reason.message : "Snapshot JSON tidak valid.");
    }
  }

  async function handleFileSelect(side: "baseline" | "target", file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    if (side === "baseline") setBaselineText(text);
    else setTargetText(text);
    applyJsonText(side, text);
  }

  const diff: SchemaDiffResult | null = useMemo(() => {
    if (!baseline || !target) return null;
    return diffSnapshots(baseline, target);
  }, [baseline, target]);

  const filteredChanges = useMemo(() => {
    if (!diff) return [];
    const needle = search.trim().toLowerCase();
    return diff.changes.filter(item => {
      if (onlyBreaking && item.severity !== "breaking") return false;
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (!needle) return true;
      if (item.name.toLowerCase().includes(needle)) return true;
      return item.fieldChanges.some(field => field.name.toLowerCase().includes(needle));
    });
  }, [diff, onlyBreaking, sourceFilter, search]);

  async function copyMarkdown() {
    if (!diff || !baseline || !target || !navigator.clipboard) return;
    const text = formatDiffMarkdown(
      diff,
      snapshotMetaLabel(baseline, "Baseline"),
      snapshotMetaLabel(target, "Target"),
    );
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const columns: ColumnsType<EndpointChange> = [
    {
      title: "Endpoint",
      key: "name",
      render: (_, row) => (
        <div>
          <span className="ca-mono">{row.name}</span>
          {row.entityTypeChanged && (
            <div>
              <Typography.Text type="secondary" className="ca-mono">
                {row.baselineEntityType} → {row.targetEntityType}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Sumber",
      dataIndex: "source",
      key: "source",
      width: 120,
      render: (value: SnapshotSource) => <Tag>{SOURCE_LABELS[value]}</Tag>,
    },
    {
      title: "Dampak",
      dataIndex: "severity",
      key: "severity",
      width: 140,
      render: (value: EndpointChange["severity"]) =>
        value === "breaking" ? <Tag color="error">Breaking</Tag> : <Tag color="blue">Penambahan</Tag>,
    },
    {
      title: "Ringkasan Perubahan",
      key: "summary",
      render: (_, row) => summarizeChange(row),
    },
  ];

  return (
    <section
      className="workspace-sheet change-analyzer"
      aria-labelledby="change-analyzer-title"
    >
      <PageHeader
        title="Change Analyzer"
        description="Bandingkan perubahan kontrak API ($metadata) Sandbox antar snapshot (mis. BC v28 → v29 atau deploy Custom API) untuk mendeteksi breaking change."
        titleId="change-analyzer-title"
      />

      <div className="ca-snapshot-bar">
        <div className="ca-filter-field">
          <label htmlFor={`${baseId}-source`}>Sumber $metadata Sandbox</label>
          <Select<NonNullable<SnapshotSourceFilter>>
            id={`${baseId}-source`}
            value={source}
            onChange={setSource}
            options={SOURCE_OPTIONS}
          />
        </div>
        <Button
          icon={<CloudDownloadOutlined aria-hidden="true" />}
          loading={liveState.status === "loading"}
          onClick={() => void fetchLive("target")}
        >
          Ambil Live ke Target
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined aria-hidden="true" />}
          loading={liveState.status === "loading"}
          onClick={() => void fetchLive("download")}
        >
          Unduh Baseline JSON
        </Button>
      </div>

      {liveState.status === "loading" && (
        <div
          className="ca-state-box"
          role="status"
          aria-live="polite"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
            marginBottom: token.marginMD,
          }}
        >
          <div className="ca-state-spinner">
            <Spin />
            <span>Mengambil snapshot $metadata dari Sandbox…</span>
          </div>
          <Skeleton active title={false} paragraph={{ rows: 4 }} />
        </div>
      )}

      {liveState.status === "error" && (
        <Alert
          type="error"
          showIcon
          message={liveState.message}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      {parseError && (
        <Alert
          type="warning"
          showIcon
          message={parseError}
          style={{ marginBottom: token.marginMD }}
        />
      )}

      <div className="ca-compare-grid">
        <div
          className="ca-input-card"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <div className="ca-input-head">
            <Typography.Text strong>Baseline (Lama)</Typography.Text>
            {baseline ? (
              <Tag color="default">{snapshotMetaLabel(baseline, "Baseline")}</Tag>
            ) : (
              <Typography.Text type="secondary">Belum dipilih</Typography.Text>
            )}
          </div>
          <div className="ca-input-actions">
            <input
              ref={baselineFileRef}
              type="file"
              accept=".json,application/json"
              className="ca-file-input"
              aria-label="Unggah file JSON Baseline"
              onChange={event => void handleFileSelect("baseline", event.target.files?.[0])}
            />
            <Button
              size="small"
              icon={<UploadOutlined aria-hidden="true" />}
              onClick={() => baselineFileRef.current?.click()}
            >
              Unggah JSON
            </Button>
            <Button
              size="small"
              disabled={liveState.status === "loading"}
              onClick={() =>
                liveState.status === "ready"
                  ? setBaseline(liveState.data)
                  : void fetchLive("baseline")
              }
            >
              Pakai Live Sandbox
            </Button>
          </div>
          <Input.TextArea
            rows={3}
            placeholder="Atau tempel JSON snapshot baseline di sini..."
            value={baselineText}
            onChange={event => setBaselineText(event.target.value)}
            aria-label="JSON snapshot Baseline"
          />
          <div>
            <Button size="small" onClick={() => applyJsonText("baseline", baselineText)}>
              Muat dari teks JSON
            </Button>
          </div>
        </div>

        <div
          className="ca-input-card"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <div className="ca-input-head">
            <Typography.Text strong>Target (Baru)</Typography.Text>
            {target ? (
              <Tag color="blue">{snapshotMetaLabel(target, "Target")}</Tag>
            ) : (
              <Typography.Text type="secondary">Belum dipilih</Typography.Text>
            )}
          </div>
          <div className="ca-input-actions">
            <input
              ref={targetFileRef}
              type="file"
              accept=".json,application/json"
              className="ca-file-input"
              aria-label="Unggah file JSON Target"
              onChange={event => void handleFileSelect("target", event.target.files?.[0])}
            />
            <Button
              size="small"
              icon={<UploadOutlined aria-hidden="true" />}
              onClick={() => targetFileRef.current?.click()}
            >
              Unggah JSON
            </Button>
            <Button
              size="small"
              disabled={liveState.status === "loading"}
              onClick={() =>
                liveState.status === "ready" ? setTarget(liveState.data) : void fetchLive("target")
              }
            >
              Pakai Live Sandbox
            </Button>
          </div>
          <Input.TextArea
            rows={3}
            placeholder="Atau tempel JSON snapshot target di sini..."
            value={targetText}
            onChange={event => setTargetText(event.target.value)}
            aria-label="JSON snapshot Target"
          />
          <div>
            <Button size="small" onClick={() => applyJsonText("target", targetText)}>
              Muat dari teks JSON
            </Button>
          </div>
        </div>
      </div>

      {!diff && (
        <div
          className="ca-state-box"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Muat Baseline (Lama) dan Target (Baru) untuk melihat perubahan endpoint, field, dan breaking change."
          />
        </div>
      )}

      {diff && (
        <div>
          <div className="ca-summary-grid" role="status">
            <article className="overview-card">
              <span className="overview-card-label">Endpoint Target</span>
              <span className="overview-card-value">{diff.summary.totalTarget}</span>
              <span className="overview-card-note">
                Baseline: {diff.summary.totalBaseline} endpoint
              </span>
            </article>
            <article className="overview-card">
              <span className="overview-card-label">Breaking Changes</span>
              <span
                className="overview-card-value"
                data-tone={diff.summary.breakingCount > 0 ? "error" : "ok"}
              >
                {diff.summary.breakingCount}
              </span>
              <span className="overview-card-note">
                {diff.summary.endpointsRemoved} hapus · {diff.summary.fieldsTypeChanged} tipe ·{" "}
                {diff.summary.fieldsRemoved} field hapus
              </span>
            </article>
            <article className="overview-card">
              <span className="overview-card-label">Penambahan (Non-Breaking)</span>
              <span className="overview-card-value">{diff.summary.nonBreakingCount}</span>
              <span className="overview-card-note">
                +{diff.summary.endpointsAdded} endpoint · +{diff.summary.fieldsAdded} field
              </span>
            </article>
            <article className="overview-card">
              <span className="overview-card-label">Tidak Berubah</span>
              <span className="overview-card-value" data-tone="muted">
                {diff.summary.unchangedCount}
              </span>
              <span className="overview-card-note">Kontrak skema identik</span>
            </article>
          </div>

          <div className="ca-filter-bar">
            <div className="ca-filter-field">
              <label htmlFor={`${baseId}-search`}>Cari endpoint atau field</label>
              <Input
                id={`${baseId}-search`}
                type="search"
                allowClear
                placeholder="Nama endpoint atau field berubah"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <div className="ca-filter-field">
              <label htmlFor={`${baseId}-src-filter`}>Filter sumber</label>
              <Select<"all" | SnapshotSource>
                id={`${baseId}-src-filter`}
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[
                  { value: "all", label: "Semua sumber" },
                  { value: "standard", label: "Standar" },
                  { value: "custom", label: "Custom" },
                  { value: "automation", label: "Automation" },
                ]}
              />
            </div>
            <div className="ca-filter-field">
              <span className="ca-filter-label" id={`${baseId}-breaking-label`}>
                Hanya breaking
              </span>
              <div className="ca-switch-field">
                <Switch
                  checked={onlyBreaking}
                  onChange={setOnlyBreaking}
                  aria-labelledby={`${baseId}-breaking-label`}
                />
                <span>Breaking</span>
              </div>
            </div>
            <Button
              icon={copied ? <CheckOutlined aria-hidden="true" /> : <CopyOutlined aria-hidden="true" />}
              onClick={() => void copyMarkdown()}
            >
              {copied ? "Tersalin" : "Salin Ringkasan Markdown"}
            </Button>
          </div>

          {filteredChanges.length === 0 ? (
            <div
              className="ca-state-box"
              style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  diff.changes.length === 0
                    ? "Tidak ada perubahan antara Baseline dan Target."
                    : "Tidak ada perubahan yang cocok dengan filter."
                }
              />
            </div>
          ) : (
            <Table<EndpointChange>
              rowKey="key"
              columns={columns}
              dataSource={filteredChanges}
              size="middle"
              scroll={{ x: 680 }}
              pagination={{
                defaultPageSize: 15,
                showSizeChanger: true,
                showTotal: total => `Menampilkan ${total} perubahan`,
              }}
              expandable={{
                rowExpandable: record => record.fieldChanges.length > 0,
                expandedRowRender: record => (
                  <Table<FieldChange>
                    rowKey={item => `${record.key}|${item.name}`}
                    columns={fieldColumns}
                    dataSource={record.fieldChanges}
                    size="small"
                    pagination={false}
                  />
                ),
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

export { DiffOutlined };
