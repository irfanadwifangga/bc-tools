import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import { renderToStaticMarkup } from "react-dom/server";
import type { paths } from "../src/api/schema";
import {
  OverviewPage,
  loadOverviewStatus,
  type OverviewStatus,
} from "../src/features/overview/OverviewPage";

function mockOverviewClient(handlers: {
  health?: () => Response;
  entities?: () => Response;
  customEntities?: () => Response;
  customers?: (url: URL) => Response;
  items?: (url: URL) => Response;
}) {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      const url = new URL(request.url);
      expect(request.method).toBe("GET");
      if (url.pathname === "/api/v1/health") return handlers.health!();
      if (url.pathname === "/api/v1/api-explorer/entities") return handlers.entities!();
      if (url.pathname === "/api/v1/api-explorer/custom-entities") return handlers.customEntities!();
      if (url.pathname === "/api/v1/api-explorer/customers/preview") return handlers.customers!(url);
      if (url.pathname === "/api/v1/api-explorer/items/preview") return handlers.items!(url);
      throw new Error(`Unexpected request: ${url.pathname}`);
    },
  });
}

test("OverviewPage renders heading, quick action, scope summary, and five bc_sdk capabilities", () => {
  const html = renderToStaticMarkup(<OverviewPage />);
  expect(html).toContain("Business Central Sandbox");
  expect(html).toContain('href="#api-explorer"');
  expect(html).toContain("Buka API Explorer");
  expect(html).toContain("Periksa ulang");
  expect(html).toContain('role="status"');
  for (const scope of ["Sandbox", "DEMO COMPANY", "Read-only"]) {
    expect(html).toContain(scope);
  }
  for (const capability of ["Companies", "Customers", "Items", "Metadata", "Custom Metadata"]) {
    expect(html).toContain(capability);
  }
});

test("OverviewPage renders populated status metrics and empty custom catalog label", () => {
  const ready: OverviewStatus = {
    backend: { state: "ok" },
    standardCatalog: { state: "ready", count: 55 },
    customCatalog: { state: "ready", count: 0 },
    customers: { state: "ready", total: 14 },
    items: { state: "ready", total: null, note: "Jumlah belum tersedia" },
  };
  const html = renderToStaticMarkup(<OverviewPage initialStatus={ready} />);
  expect(html).toContain("Aktif");
  expect(html).toContain("55 endpoint");
  expect(html).toContain("Belum dikonfigurasi");
  expect(html).toContain(">14<");
  expect(html).toContain(">—<");
  expect(html).toContain("Jumlah belum tersedia");
});

test("loadOverviewStatus loads health, catalog counts, and DEMO COMPANY counts", async () => {
  const client = mockOverviewClient({
    health: () => Response.json({ status: "ok" }),
    entities: () => Response.json([
      { name: "customers", entity_type: "Microsoft.NAV.customer", fields: [] },
      { name: "items", entity_type: "Microsoft.NAV.item", fields: [] },
    ]),
    customEntities: () => Response.json([
      { name: "customLedgers", entity_type: "Custom.ledger", fields: [] },
    ]),
    customers: url => {
      expect(url.searchParams.get("limit")).toBe("1");
      expect(url.searchParams.get("fields")).toBe("id");
      expect(url.searchParams.get("count")).toBe("true");
      return Response.json([{ id: "c1" }], { headers: { "X-Total-Count": "42" } });
    },
    items: url => {
      expect(url.searchParams.get("limit")).toBe("1");
      expect(url.searchParams.get("fields")).toBe("id");
      expect(url.searchParams.get("count")).toBe("true");
      return Response.json([{ id: "i1" }], { headers: { "X-Total-Count": "120" } });
    },
  });

  const status = await loadOverviewStatus(new AbortController().signal, client);
  expect(status).toEqual({
    backend: { state: "ok" },
    standardCatalog: { state: "ready", count: 2 },
    customCatalog: { state: "ready", count: 1 },
    customers: { state: "ready", total: 42 },
    items: { state: "ready", total: 120 },
  });
});

test("loadOverviewStatus handles empty custom catalog and partial or full error fallbacks", async () => {
  const client = mockOverviewClient({
    health: () => Response.json({ error: { code: "down", message: "Backend mati" } }, { status: 503 }),
    entities: () => Response.json({ error: { code: "bc_err", message: "Metadata gagal" } }, { status: 502 }),
    customEntities: () => Response.json([]),
    customers: () => Response.json([{ id: "c1" }]),
    items: () => Response.json({ error: { code: "bc_err", message: "Item gagal" } }, { status: 502 }),
  });

  const status = await loadOverviewStatus(new AbortController().signal, client);
  expect(status).toEqual({
    backend: { state: "error", message: "Backend mati" },
    standardCatalog: { state: "error", message: "Metadata gagal" },
    customCatalog: { state: "ready", count: 0 },
    customers: { state: "ready", total: null, note: "Jumlah belum tersedia" },
    items: { state: "error", message: "Item gagal" },
  });
});
