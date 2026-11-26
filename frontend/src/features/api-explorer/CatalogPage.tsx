import { Alert, Button, Empty, Input, Modal, Skeleton, Spin, Tabs, theme } from "antd";
import { ApiOutlined, AppstoreOutlined, BarsOutlined, CodeOutlined, DatabaseOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import {
  endpointKey, filterEndpoints, groupEndpoints, loadCatalog, loadCustomCatalog,
  type CatalogEntity, type PreviewQuery, type SourceFilter,
} from "./catalog";
import { EndpointCodeSamples } from "./CustomerCodeSamples";
import { CustomerPreview } from "./CustomerPreview";
import { DEFAULT_PREVIEW_LIMIT } from "./customerSamples";
import "./catalog.css";

type CatalogState =
  | { status: "loading" }
  | { status: "ready"; entities: CatalogEntity[] }
  | { status: "error"; message: string };

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const parts = [];
  let start = 0;
  for (let index = lower.indexOf(query); index !== -1; index = lower.indexOf(query, start)) {
    parts.push(text.slice(start, index), <mark key={index}>{text.slice(index, index + query.length)}</mark>);
    start = index + query.length;
  }
  return parts.length ? [...parts, text.slice(start)] : text;
}

function EndpointExamples({ entity }: { entity: CatalogEntity }) {
  const [query, setQuery] = useState<PreviewQuery>({ limit: DEFAULT_PREVIEW_LIMIT });
  return (
    <Tabs
      defaultActiveKey="preview"
      className="catalog-sandbox-tabs"
      items={[
        {
          key: "preview",
          label: "Preview Data",
          forceRender: true,
          children: (
            <CustomerPreview
              resource={entity.name === "items" ? "item" : "customer"}
              query={query}
              onQueryChange={setQuery}
            />
          ),
        },
        {
          key: "samples",
          label: "Contoh Kode GET",
          forceRender: true,
          children: <EndpointCodeSamples entity={entity} query={query} />,
        },
      ]}
    />
  );
}

export function EndpointDetail({ entity, query }: { entity: CatalogEntity; query: string }) {
  const [fieldSearch, setFieldSearch] = useState("");
  const localQuery = fieldSearch.trim().toLowerCase();
  const activeQuery = localQuery || query;
  const visibleFields = localQuery
    ? entity.fields.filter(field => field.name.toLowerCase().includes(localQuery))
    : entity.fields;
  const supportsPreview =
    entity.source !== "custom" && (entity.name === "customers" || entity.name === "items");
  return (
    <div className="catalog-detail">
      <p className="catalog-type">Entity type <code>{entity.entity_type}</code> · {entity.fields.length} field</p>
      <div className="catalog-detail-split">
        <section className="catalog-detail-pane catalog-detail-fields" aria-label="Struktur field">
          <div className="catalog-pane-header">
            <h3 className="catalog-pane-title">Struktur field</h3>
            {entity.fields.length > 8 && (
              <Input
                type="search"
                size="small"
                allowClear
                className="catalog-field-filter"
                prefix={<SearchOutlined aria-hidden="true" />}
                placeholder="Cari field..."
                aria-label="Cari field di endpoint ini"
                value={fieldSearch}
                onChange={event => setFieldSearch(event.target.value)}
              />
            )}
          </div>
          {visibleFields.length ? (
            <div className="catalog-fields-scroll">
              <table aria-label={`Field ${entity.name}`}>
                <thead><tr><th scope="col">Field</th><th scope="col">Tipe</th></tr></thead>
                <tbody>{visibleFields.map(field => (
                  <tr key={field.name}><td>{highlightMatch(field.name, activeQuery)}</td><td>{field.type}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="catalog-empty-inline">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={entity.fields.length ? "Tidak ada field yang cocok." : "Endpoint ini tidak memiliki field struktural."}
              >
                {localQuery && <Button size="small" onClick={() => setFieldSearch("")}>Reset pencarian</Button>}
              </Empty>
            </div>
          )}
        </section>
        <section
          className="catalog-detail-pane catalog-detail-sandbox"
          aria-label={supportsPreview ? "Preview dan contoh kode" : "Contoh Kode GET"}
        >
          {supportsPreview ? (
            <EndpointExamples entity={entity} />
          ) : (
            <>
              <div className="catalog-pane-header">
                <h3 className="catalog-pane-title">Contoh Kode GET</h3>
              </div>
              <EndpointCodeSamples entity={entity} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function EndpointRow({ entity, open, query, onSelect }: {
  entity: CatalogEntity;
  open: boolean;
  query: string;
  onSelect: () => void;
}) {
  const fieldHint = !open && query
    ? entity.fields.find(field => field.name.toLowerCase().includes(query))
    : undefined;
  return (
    <li className="catalog-row">
      <button type="button" className="catalog-endpoint" aria-haspopup="dialog"
        aria-expanded={open} onClick={onSelect}>
        <span className="catalog-result-name">
          {highlightMatch(entity.name, query)}
          <span className="catalog-source">{entity.source === "custom" ? "Custom" : "Standar"}</span>
          <span className="catalog-field-count"> · {entity.fields.length} field</span>
          {fieldHint && <span className="catalog-field-hint"> · {highlightMatch(fieldHint.name, query)}</span>}
        </span>
        <RightOutlined aria-hidden="true" />
      </button>
    </li>
  );
}

function useCatalog(load: typeof loadCatalog, fallback: string) {
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      entities => {
        if (!controller.signal.aborted) setCatalog({ status: "ready", entities });
      },
      reason => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error && !(reason instanceof TypeError)
          ? reason.message : fallback;
        setCatalog({ status: "error", message });
      },
    );
    return () => controller.abort();
  }, [attempt, load, fallback]);

  function retry() {
    setCatalog({ status: "loading" });
    setAttempt(value => value + 1);
  }
  return { catalog, retry };
}

export function CatalogPage() {
  const { token } = theme.useToken();
  const standard = useCatalog(loadCatalog, "Katalog standar gagal dimuat. Periksa backend lokal.");
  const custom = useCatalog(loadCustomCatalog, "Katalog custom gagal dimuat. Periksa backend lokal.");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const entities = [standard, custom].flatMap(({ catalog }) => catalog.status === "ready" ? catalog.entities : []);
  const loading = standard.catalog.status === "loading" || custom.catalog.status === "loading";
  const allReady = standard.catalog.status === "ready" && custom.catalog.status === "ready";
  const results = filterEndpoints(entities, search, sourceFilter);
  const selectedEntity = selected ? entities.find(entity => endpointKey(entity) === selected) ?? null : null;
  return (
    <section className={viewMode === "grid" ? "workspace-sheet catalog catalog--grid" : "workspace-sheet catalog"} aria-labelledby="catalog-title">
      <PageHeader
        title="API Explorer"
        description="Telusuri endpoint standar dan custom Business Central Sandbox beserta field dan contoh query."
        titleId="catalog-title"
      />
      {loading && (
        <div
          className={entities.length === 0 ? "catalog-state-box" : "catalog-state-banner"}
          role="status"
          aria-live="polite"
          style={
            entities.length === 0
              ? { background: token.colorBgContainer, borderColor: token.colorBorderSecondary }
              : undefined
          }
        >
          <div className="catalog-state-spinner">
            <Spin size={entities.length === 0 ? "default" : "small"} />
            <span>Memuat katalog endpoint…</span>
          </div>
          {entities.length === 0 && <Skeleton active title={false} paragraph={{ rows: 4 }} />}
        </div>
      )}
      {([["Standar", standard], ["Custom", custom]] as const).map(([source, { catalog, retry }]) =>
        catalog.status === "error" && (
          <div key={source} className="catalog-source-error">
            <Alert
              type="error"
              showIcon
              message={`${source} · ${catalog.message}`}
              action={
                <Button size="small" icon={<ReloadOutlined aria-hidden="true" />}
                  onClick={retry} aria-label={"Coba lagi katalog " + source.toLowerCase()}>
                  Coba lagi
                </Button>
              }
            />
          </div>
        ))}
      {allReady && entities.length === 0 && (
        <div
          className="catalog-state-box"
          role="status"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Katalog sandbox kosong." />
        </div>
      )}
      {entities.length > 0 && (
        <>
            <label htmlFor="endpoint-search">Cari endpoint atau field</label>
            <div className="catalog-toolbar">
              <Input id="endpoint-search" type="search" allowClear prefix={<SearchOutlined aria-hidden="true" />}
                placeholder="Misalnya customers atau postalCode" value={search}
                onChange={event => setSearch(event.target.value)} />
              <div className="catalog-filter-row">
                <div role="group" aria-label="Filter sumber endpoint" className="catalog-source-filters">
                  {([
                    ["all", "Semua", DatabaseOutlined],
                    ["standard", "Standar", ApiOutlined],
                    ["custom", "Custom", CodeOutlined],
                  ] as const).map(([value, label, Icon]) => (
                    <button key={value} type="button" aria-pressed={sourceFilter === value}
                      onClick={() => setSourceFilter(value)}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div role="group" aria-label="Tampilan katalog" className="catalog-view-toggle">
                  {([
                    ["list", "List", BarsOutlined],
                    ["grid", "Grid", AppstoreOutlined],
                  ] as const).map(([value, label, Icon]) => (
                    <button key={value} type="button" aria-pressed={viewMode === value}
                      onClick={() => setViewMode(value)}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="catalog-count" role="status">
              {`${results.length} endpoint`}
            </p>
            {results.length === 0 ? (
              <div className="catalog-state-box">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada endpoint yang cocok.">
                  {(search || sourceFilter !== "all") && (
                    <Button onClick={() => { setSearch(""); setSourceFilter("all"); }}>
                      Reset filter
                    </Button>
                  )}
                </Empty>
              </div>
            ) : (
              groupEndpoints(results).map(({ letter, entities }) => (
                <div key={letter} className="catalog-group">
                  <h2 className="catalog-letter">{letter}</h2>
                  <ul className={viewMode === "grid" ? "catalog-results catalog-results--grid" : "catalog-results"}
                    aria-label={`Endpoint ${letter}`}>
                    {entities.map(entity => {
                      const key = endpointKey(entity);
                      return <EndpointRow key={key} entity={entity} query={query}
                        open={selected === key}
                        onSelect={() => setSelected(key)} />;
                    })}
                  </ul>
                </div>
              ))
            )}
            <Modal
              open={selectedEntity !== null}
              onCancel={() => setSelected(null)}
              footer={null}
              width={1200}
              style={{ maxWidth: "94vw" }}
              centered
              destroyOnHidden
              title={selectedEntity && (
                <span className="catalog-modal-title">
                  <span>{selectedEntity.name}</span>
                  <span className="catalog-source-pill">{selectedEntity.source === "custom" ? "Custom" : "Standar"}</span>
                </span>
              )}
            >
              {selectedEntity && <EndpointDetail key={endpointKey(selectedEntity)} entity={selectedEntity} query={query} />}
            </Modal>
          </>)}
    </section>
  );
}
