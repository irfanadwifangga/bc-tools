import createClient from "openapi-fetch";
import type { components, paths } from "../../api/schema";

export type CatalogEntity = components["schemas"]["MetadataEntity"] & { source?: "custom" };

export function endpointKey(entity: CatalogEntity): string {
  return (entity.source ?? "standard") + "/" + entity.name;
}

export type PreviewCustomer = components["schemas"]["CustomerPreview"];
export type PreviewQuery = NonNullable<paths["/api/v1/api-explorer/customers/preview"]["get"]["parameters"]["query"]>;
export type PreviewOrder = NonNullable<PreviewQuery["order"]>;
export const PREVIEW_FIELDS = ["id", "number", "displayName"] as const;
export type PreviewField = (typeof PREVIEW_FIELDS)[number];

export function selectedPreviewFields(fields?: string): PreviewField[] {
  if (!fields) return [...PREVIEW_FIELDS];
  const chosen = new Set(fields.split(","));
  const result = PREVIEW_FIELDS.filter(field => chosen.has(field));
  return result.length ? result : [...PREVIEW_FIELDS];
}

const api = createClient<paths>();

export async function loadCatalog(signal: AbortSignal, client = api): Promise<CatalogEntity[]> {
  const { data, error } = await client.GET("/api/v1/api-explorer/entities", { signal });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Katalog gagal dimuat. Periksa backend lokal.");
  }
  return data;
}

export async function loadCustomCatalog(signal: AbortSignal, client = api): Promise<CatalogEntity[]> {
  const { data, error } = await client.GET("/api/v1/api-explorer/custom-entities", { signal });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Katalog custom gagal dimuat.");
  }
  return data.map(entity => ({ ...entity, source: "custom" }));
}

type PreviewPath = "/api/v1/api-explorer/customers/preview" | "/api/v1/api-explorer/items/preview";

async function loadPreview(
  path: PreviewPath,
  signal: AbortSignal,
  query: PreviewQuery = {},
  client = api,
  onCount?: (total: number | null) => void,
): Promise<PreviewCustomer[]> {
  const { data, error, response } = await client.GET(path, { signal, params: { query } });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Contoh data gagal dimuat.");
  }
  if (onCount) {
    const raw = response.headers.get("X-Total-Count")?.trim() ?? "";
    onCount(/^\d+$/.test(raw) ? Number(raw) : null);
  }
  return data;
}

export function loadCustomerPreview(
  signal: AbortSignal,
  query: PreviewQuery = {},
  client = api,
  onCount?: (total: number | null) => void,
): Promise<PreviewCustomer[]> {
  return loadPreview("/api/v1/api-explorer/customers/preview", signal, query, client, onCount);
}

export function loadItemPreview(
  signal: AbortSignal,
  query: PreviewQuery = {},
  client = api,
  onCount?: (total: number | null) => void,
): Promise<PreviewCustomer[]> {
  return loadPreview("/api/v1/api-explorer/items/preview", signal, query, client, onCount);
}

export type SourceFilter = "all" | "standard" | "custom";

export function filterEndpoints(entities: CatalogEntity[], search: string, source: SourceFilter = "all") {
  const query = search.trim().toLowerCase();
  return entities.filter(entity =>
    (source === "all" || (entity.source ?? "standard") === source) &&
    (entity.name.toLowerCase().includes(query) ||
      entity.fields.some(field => field.name.toLowerCase().includes(query))),
  );
}

const byName = new Intl.Collator("id", { sensitivity: "base" });

export function groupEndpoints(entities: CatalogEntity[]) {
  const groups = new Map<string, CatalogEntity[]>();
  for (const entity of entities) {
    const initial = entity.name.charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(initial) ? initial : "#";
    const group = groups.get(letter);
    if (group) group.push(entity);
    else groups.set(letter, [entity]);
  }

  return [...groups].sort(([a], [b]) => byName.compare(a, b)).map(([letter, members]) => ({
    letter,
    entities: members.sort((a, b) => byName.compare(a.name, b.name)),
  }));
}
