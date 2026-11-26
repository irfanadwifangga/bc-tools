import createClient from "openapi-fetch";
import type { components, paths } from "../../api/schema";

export type CatalogEntity = components["schemas"]["MetadataEntity"];

export type PreviewCustomer = components["schemas"]["CustomerPreview"];

const api = createClient<paths>();

export async function loadCatalog(signal: AbortSignal): Promise<CatalogEntity[]> {
  const { data, error } = await api.GET("/api/v1/api-explorer/entities", { signal });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Katalog gagal dimuat. Periksa backend lokal.");
  }
  return data;
}

export async function loadCustomerPreview(signal: AbortSignal, client = api): Promise<PreviewCustomer[]> {
  const { data, error } = await client.GET("/api/v1/api-explorer/customers/preview", { signal });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Contoh data gagal dimuat.");
  }
  return data;
}

export function filterEndpoints(entities: CatalogEntity[], search: string) {
  const query = search.trim().toLowerCase();
  return entities.filter(({ name, fields }) =>
    name.toLowerCase().includes(query) ||
    fields.some(field => field.name.toLowerCase().includes(query)),
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
