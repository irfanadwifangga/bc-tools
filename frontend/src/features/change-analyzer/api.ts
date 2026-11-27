import createClient from "openapi-fetch";
import type { components, paths } from "../../api/schema";

export type SchemaSnapshot = components["schemas"]["SchemaSnapshotResponse"];
export type SnapshotEndpoint = components["schemas"]["SnapshotEndpoint"];
export type SnapshotField = components["schemas"]["SnapshotField"];
export type SnapshotSource = SnapshotEndpoint["source"];
export type SnapshotSourceFilter = NonNullable<
  paths["/api/v1/change-analyzer/snapshot"]["get"]["parameters"]["query"]
>["source"];

const api = createClient<paths>();
export type ChangeAnalyzerClient = typeof api;

export function extractChangeErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as components["schemas"]["ErrorResponse"]).error;
    if (err?.message && err.message.trim()) {
      return err.code ? `${err.message} (${err.code})` : err.message;
    }
  }
  return fallback;
}

export async function loadSchemaSnapshot(
  source: NonNullable<SnapshotSourceFilter>,
  signal: AbortSignal,
  client: ChangeAnalyzerClient = api,
): Promise<SchemaSnapshot> {
  const { data, error, response } = await client.GET("/api/v1/change-analyzer/snapshot", {
    signal,
    params: { query: { source } },
  });
  if (!response.ok || !data) {
    throw new Error(
      extractChangeErrorMessage(
        error,
        "Snapshot skema Sandbox gagal diambil. Periksa backend lokal.",
      ),
    );
  }
  return data;
}
