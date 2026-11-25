import { Button, Input } from "antd";
import { RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useId, useState } from "react";
import { filterEndpoints, loadCatalog, type CatalogEntity } from "./catalog";
import { CustomerPreview } from "./CustomerPreview";
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
          {fieldHint && <span className="catalog-field-hint"> · {highlightMatch(fieldHint.name, query)}</span>}
        </span>
        <RightOutlined aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!open} className="catalog-detail">
        {open && <>
          <p className="catalog-type">Entity type <code>{entity.entity_type}</code></p>
          {entity.name === "customers" && <CustomerPreview />}
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

export function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      entities => {
        if (!controller.signal.aborted) setCatalog({ status: "ready", entities });
      },
      reason => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error && !(reason instanceof TypeError)
          ? reason.message : "Katalog gagal dimuat. Periksa backend lokal.";
        setCatalog({ status: "error", message });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const query = search.trim().toLowerCase();
  const results = catalog.status === "ready" ? filterEndpoints(catalog.entities, search) : [];
  return (
    <section className="workspace-sheet catalog" aria-labelledby="catalog-title">
      <h1 id="catalog-title" className="workspace-title">API Explorer</h1>
      {catalog.status === "loading" && <p role="status">Memuat katalog endpoint…</p>}
      {catalog.status === "error" && (
        <>
          <p role="alert">{catalog.message}</p>
          <Button onClick={() => {
            setCatalog({ status: "loading" });
            setAttempt(value => value + 1);
          }}>Coba lagi</Button>
        </>
      )}
      {catalog.status === "ready" && (catalog.entities.length === 0
        ? <p role="status">Katalog sandbox kosong.</p>
        : <>
            <label htmlFor="endpoint-search">Cari endpoint atau field</label>
            <Input id="endpoint-search" type="search" prefix={<SearchOutlined aria-hidden="true" />}
              placeholder="Misalnya customers atau postalCode" value={search}
              onChange={event => setSearch(event.target.value)} />
            <p className="catalog-count" role="status">
              {results.length ? `${results.length} endpoint` : "Tidak ada endpoint yang cocok."}
            </p>
            <ul className="catalog-results">
              {results.map(entity => <EndpointRow key={entity.name} entity={entity} query={query}
                open={selected === entity.name}
                onSelect={() => setSelected(selected === entity.name ? null : entity.name)} />)}
            </ul>
          </>)}
    </section>
  );
}
