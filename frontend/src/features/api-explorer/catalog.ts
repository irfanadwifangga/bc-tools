import createClient from "openapi-fetch";
import type { components, paths } from "../../api/schema";

export type CatalogEntity = components["schemas"]["MetadataEntity"];

const api = createClient<paths>();

export async function loadCatalog(signal: AbortSignal): Promise<CatalogEntity[]> {
  const { data, error } = await api.GET("/api/v1/api-explorer/entities", { signal });
  if (!Array.isArray(data)) {
    throw new Error(error?.error?.message || "Katalog gagal dimuat. Periksa backend lokal.");
  }
  return data;
}

export function filterEndpoints(entities: CatalogEntity[], search: string) {
  const query = search.trim().toLowerCase();
  return entities.filter(({ name }) => name.toLowerCase().includes(query));
}
