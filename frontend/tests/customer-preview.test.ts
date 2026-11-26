import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import type { paths } from "../src/api/schema";
import { loadCustomerPreview, loadItemPreview } from "../src/features/api-explorer/catalog";

function clientReturning(body: unknown, status = 200, endpoint = "customers", limit: string | null = null, order: string | null = null) {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      expect(request.method).toBe("GET");
      expect(new URL(request.url).searchParams.get("limit")).toBe(limit);
      expect(new URL(request.url).searchParams.get("order")).toBe(order);
      expect(new URL(request.url).pathname).toBe(`/api/v1/api-explorer/${endpoint}/preview`);
      return Response.json(body, { status });
    },
  });
}

test("loads customer fields and preserves an empty preview", async () => {
  const signal = new AbortController().signal;
  const rows = [{ id: "00000000-0000-4000-8000-000000000001", number: "DEMO-01", displayName: "Contoh" }];
  expect(await loadCustomerPreview(signal, { limit: 2, order: "number asc" },
    clientReturning(rows, 200, "customers", "2", "number asc"))).toEqual(rows);
  expect(await loadCustomerPreview(signal, undefined, clientReturning([]))).toEqual([]);
});

test("reports the backend preview error", async () => {
  const body = { error: { code: "sandbox_error", message: "Sandbox contoh gagal.", details: {} } };
  await expect(loadCustomerPreview(new AbortController().signal, undefined, clientReturning(body, 502)))
    .rejects.toThrow("Sandbox contoh gagal.");
});

test("loads item preview from its dedicated GET route", async () => {
  const rows = [{ id: "00000000-0000-4000-8000-000000000001", number: "I01", displayName: "Contoh item" }];
  expect(await loadItemPreview(new AbortController().signal, { limit: 1, order: "displayName desc" },
    clientReturning(rows, 200, "items", "1", "displayName desc")))
    .toEqual(rows);
});
