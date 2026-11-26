import { Button, Input } from "antd";
import { RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useId, useState } from "react";
import {
  endpointKey, filterEndpoints, groupEndpoints, loadCatalog, loadCustomCatalog,
  type CatalogEntity, type PreviewQuery,
} from "./catalog";
import { EndpointCodeSamples } from "./CustomerCodeSamples";
import { CustomerPreview } from "./CustomerPreview";
import { DEFAULT_PREVIEW_LIMIT, type SampleEndpoint } from "./customerSamples";
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

function EndpointExamples({ endpoint }: { endpoint: SampleEndpoint }) {
  const [query, setQuery] = useState<PreviewQuery>({ limit: DEFAULT_PREVIEW_LIMIT });
  return (
    <>
      <CustomerPreview resource={endpoint === "items" ? "item" : "customer"}
        query={query} onQueryChange={setQuery} />
      <EndpointCodeSamples endpoint={endpoint} query={query} />
    </>
  );
}

export function EndpointRow({ entity, open, query, onSelect }: {
  entity: CatalogEntity;
  open: boolean;
  query: string;
  onSelect: () => void;
}) {
  const panelId = useId();
  const fieldHint = !open && query
    ? entity.fields.find(field => field.name.toLowerCase().includes(query))
    : undefined;
  return (
    <li className="catalog-row">
      <button type="button" className="catalog-endpoint" aria-expanded={open}
        aria-controls={panelId} onClick={onSelect}>
        <span className="catalog-result-name">
          {highlightMatch(entity.name, query)}
          <span className="catalog-source">{entity.source === "custom" ? "Custom" : "Standar"}</span>
          {fieldHint && <span className="catalog-field-hint"> · {highlightMatch(fieldHint.name, query)}</span>}
        </span>
        <RightOutlined aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!open} className="catalog-detail">
        {open && <>
          <p className="catalog-type">Entity type <code>{entity.entity_type}</code></p>
          {entity.source !== "custom" && (entity.name === "customers" || entity.name === "items") &&
            <EndpointExamples endpoint={entity.name} />}
          {entity.fields.length ? (
            <table aria-label={`Field ${entity.name}`}>
              <thead><tr><th scope="col">Field</th><th scope="col">Tipe</th></tr></thead>
              <tbody>{entity.fields.map(field => (
                <tr key={field.name}><td>{highlightMatch(field.name, query)}</td><td>{field.type}</td></tr>
              ))}</tbody>
            </table>
          ) : <p>Endpoint ini tidak memiliki field struktural.</p>}
        </>}
      </div>
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
  const standard = useCatalog(loadCatalog, "Katalog standar gagal dimuat. Periksa backend lokal.");
  const custom = useCatalog(loadCustomCatalog, "Katalog custom gagal dimuat. Periksa backend lokal.");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const entities = [standard, custom].flatMap(({ catalog }) => catalog.status === "ready" ? catalog.entities : []);
  const loading = standard.catalog.status === "loading" || custom.catalog.status === "loading";
  const allReady = standard.catalog.status === "ready" && custom.catalog.status === "ready";
  const results = filterEndpoints(entities, search);
  return (
    <section className="workspace-sheet catalog" aria-labelledby="catalog-title">
      <h1 id="catalog-title" className="workspace-title">API Explorer</h1>
      {loading && <p role="status">Memuat katalog endpoint…</p>}
      {([["Standar", standard], ["Custom", custom]] as const).map(([source, { catalog, retry }]) =>
        catalog.status === "error" && (
          <div key={source} className="catalog-source-error">
            <p role="alert">{source} · {catalog.message}</p>
            <Button onClick={retry} aria-label={"Coba lagi katalog " + source.toLowerCase()}>Coba lagi</Button>
          </div>
        ))}
      {allReady && entities.length === 0 && <p role="status">Katalog sandbox kosong.</p>}
      {entities.length > 0 && (
        <>
            <label htmlFor="endpoint-search">Cari endpoint atau field</label>
            <Input id="endpoint-search" type="search" prefix={<SearchOutlined aria-hidden="true" />}
              placeholder="Misalnya customers atau postalCode" value={search}
              onChange={event => setSearch(event.target.value)} />
            <p className="catalog-count" role="status">
              {results.length ? `${results.length} endpoint` : "Tidak ada endpoint yang cocok."}
            </p>
            {groupEndpoints(results).map(({ letter, entities }) => (
              <div key={letter} className="catalog-group">
                <h2 className="catalog-letter">{letter}</h2>
                <ul className="catalog-results" aria-label={`Endpoint ${letter}`}>
                  {entities.map(entity => {
                    const key = endpointKey(entity);
                    return <EndpointRow key={key} entity={entity} query={query}
                      open={selected === key}
                      onSelect={() => setSelected(selected === key ? null : key)} />;
                  })}
                </ul>
              </div>
            ))}
          </>)}
    </section>
  );
}
