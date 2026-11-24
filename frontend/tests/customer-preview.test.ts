import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import type { paths } from "../src/api/schema";
import { loadCustomerPreview } from "../src/features/api-explorer/catalog";

function clientReturning(body: unknown, status = 200) {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      expect(request.method).toBe("GET");
      expect(new URL(request.url).pathname).toBe("/api/v1/api-explorer/customers/preview");
      return Response.json(body, { status });
    },
  });
}

test("loads customer fields and preserves an empty preview", async () => {
  const signal = new AbortController().signal;
  const rows = [{ id: "00000000-0000-4000-8000-000000000001", number: "DEMO-01", displayName: "Contoh" }];
  expect(await loadCustomerPreview(signal, clientReturning(rows))).toEqual(rows);
  expect(await loadCustomerPreview(signal, clientReturning([]))).toEqual([]);
});

test("reports the backend preview error", async () => {
  const body = { error: { code: "sandbox_error", message: "Sandbox contoh gagal.", details: {} } };
  await expect(loadCustomerPreview(new AbortController().signal, clientReturning(body, 502)))
    .rejects.toThrow("Sandbox contoh gagal.");
});
