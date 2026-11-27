import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import { renderToStaticMarkup } from "react-dom/server";
import type { paths } from "../src/api/schema";
import {
  extractChangeErrorMessage,
  loadSchemaSnapshot,
  type SchemaSnapshot,
} from "../src/features/change-analyzer/api";
import { ChangeAnalyzerPage } from "../src/features/change-analyzer/ChangeAnalyzerPage";
import {
  diffSnapshots,
  formatDiffMarkdown,
  parseSnapshotJson,
} from "../src/features/change-analyzer/diff";
import { WorkspaceLayout } from "../src/layouts/WorkspaceLayout";

const baselineSnapshot: SchemaSnapshot = {
  schemaVersion: 1,
  capturedAt: "2026-11-26T10:00:00Z",
  environment: "Sandbox",
  customApiRoute: "ptmis/demo/v1.0",
  sources: ["standard", "custom"],
  endpoints: [
    {
      source: "standard",
      name: "customers",
      entityType: "Microsoft.NAV.customer",
      fields: [
        { name: "id", type: "Edm.Guid" },
        { name: "number", type: "Edm.String" },
        { name: "legacyCode", type: "Edm.String" },
      ],
    },
    {
      source: "standard",
      name: "oldEndpoint",
      entityType: "Microsoft.NAV.old",
      fields: [{ name: "id", type: "Edm.Guid" }],
    },
    {
      source: "custom",
      name: "demoItems",
      entityType: "Microsoft.NAV.demoItem",
      fields: [{ name: "code", type: "Edm.String" }],
    },
  ],
};

const targetSnapshot: SchemaSnapshot = {
  schemaVersion: 1,
  capturedAt: "2026-11-27T12:00:00Z",
  environment: "Sandbox",
  customApiRoute: "ptmis/demo/v1.0",
  sources: ["standard", "custom"],
  endpoints: [
    {
      source: "standard",
      name: "customers",
      entityType: "Microsoft.NAV.customer",
      fields: [
        { name: "id", type: "Edm.Guid" },
        { name: "number", type: "Edm.Int32" },
        { name: "creditLimit", type: "Edm.Decimal" },
      ],
    },
    {
      source: "standard",
      name: "salesOrders",
      entityType: "Microsoft.NAV.salesOrder",
      fields: [{ name: "id", type: "Edm.Guid" }],
    },
    {
      source: "custom",
      name: "demoItems",
      entityType: "Microsoft.NAV.demoItem",
      fields: [{ name: "code", type: "Edm.String" }],
    },
  ],
};

test("parseSnapshotJson validates schemaVersion and endpoint entries", () => {
  const parsed = parseSnapshotJson(JSON.stringify(baselineSnapshot));
  expect(parsed.endpoints).toHaveLength(3);
  expect(() => parseSnapshotJson("not json")).toThrow("Format JSON snapshot tidak valid.");
  expect(() => parseSnapshotJson(JSON.stringify({ schemaVersion: 2, endpoints: [] }))).toThrow(
    "schemaVersion: 1",
  );
  expect(() =>
    parseSnapshotJson(
      JSON.stringify({
        schemaVersion: 1,
        endpoints: [{ source: "bad", name: "x", entityType: "t", fields: [] }],
      }),
    ),
  ).toThrow("standard, custom, atau automation");
});

test("diffSnapshots classifies breaking changes, additions, unchanged endpoints, and markdown", () => {
  const diff = diffSnapshots(baselineSnapshot, targetSnapshot);
  expect(diff.summary).toEqual({
    totalBaseline: 3,
    totalTarget: 3,
    breakingCount: 2,
    nonBreakingCount: 1,
    unchangedCount: 1,
    endpointsRemoved: 1,
    endpointsAdded: 1,
    endpointsChanged: 1,
    fieldsRemoved: 2,
    fieldsTypeChanged: 1,
    fieldsAdded: 2,
  });

  expect(diff.changes.map(c => [c.name, c.severity])).toEqual([
    ["customers", "breaking"],
    ["oldEndpoint", "breaking"],
    ["salesOrders", "non_breaking"],
  ]);

  const md = formatDiffMarkdown(diff, "v28", "v29");
  expect(md).toContain("[BREAKING] `standard/customers` (changed)");
  expect(md).toContain("`number` (`Edm.String` -> `Edm.Int32`)");
  expect(md).toContain("[NON-BREAKING] `standard/salesOrders` (added)");
});

test("loadSchemaSnapshot calls GET endpoint and extracts standardized backend errors", async () => {
  expect(
    extractChangeErrorMessage({ error: { code: "BC_AUTH_ERROR", message: "Ditolak" } }, "Fallback"),
  ).toBe("Ditolak (BC_AUTH_ERROR)");

  const client = createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      expect(request.method).toBe("GET");
      const url = new URL(request.url);
      expect(url.pathname).toBe("/api/v1/change-analyzer/snapshot");
      if (url.searchParams.get("source") === "custom") {
        return Response.json(
          { error: { code: "BC_NOT_FOUND", message: "Custom API tidak ditemukan" } },
          { status: 404 },
        );
      }
      return Response.json(targetSnapshot);
    },
  });

  const snap = await loadSchemaSnapshot("all", new AbortController().signal, client);
  expect(snap.endpoints).toHaveLength(3);

  await expect(
    loadSchemaSnapshot("custom", new AbortController().signal, client),
  ).rejects.toThrow("Custom API tidak ditemukan (BC_NOT_FOUND)");
});

test("ChangeAnalyzerPage renders loading, error, diff table, and WorkspaceLayout navigation", () => {
  const loadingHtml = renderToStaticMarkup(
    <ChangeAnalyzerPage initialLiveState={{ status: "loading" }} />,
  );
  expect(loadingHtml).toContain("Cara pakai &amp; simulasi cepat");
  expect(loadingHtml).toContain("Coba Contoh Simulasi (v28 → v29)");
  expect(loadingHtml).toContain("Mengambil snapshot $metadata dari Sandbox");

  const errorHtml = renderToStaticMarkup(
    <ChangeAnalyzerPage
      initialLiveState={{ status: "error", message: "Koneksi gagal (BC_UPSTREAM_ERROR)" }}
    />,
  );
  expect(errorHtml).toContain("Koneksi gagal (BC_UPSTREAM_ERROR)");

  const readyHtml = renderToStaticMarkup(
    <ChangeAnalyzerPage initialBaseline={baselineSnapshot} initialTarget={targetSnapshot} />,
  );
  expect(readyHtml).toContain("Change Analyzer");
  expect(readyHtml).toContain("Breaking Changes");
  expect(readyHtml).toContain("customers");
  expect(readyHtml).toContain("oldEndpoint");
  expect(readyHtml).toContain("salesOrders");
  expect(readyHtml).toContain("1 field dihapus, 1 tipe berubah, 1 field baru");

  const prevWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    location: { hash: "#change-analyzer" },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  try {
    const layoutHtml = renderToStaticMarkup(
      <WorkspaceLayout choice="system" onThemeChange={() => {}} />,
    );
    expect(layoutHtml).toContain('href="#change-analyzer"');
    expect(layoutHtml).toContain("Change Analyzer");
  } finally {
    (globalThis as { window?: unknown }).window = prevWindow;
  }
});
