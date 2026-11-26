import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import type { paths } from "../src/api/schema";
import { loadCustomerPreview, loadItemPreview } from "../src/features/api-explorer/catalog";

function clientReturning(
  body: unknown,
  status = 200,
  endpoint = "customers",
  limit: string | null = null,
  order: string | null = null,
  number: string | null = null,
  name: string | null = null,
  count: string | null = null,
  headers?: HeadersInit,
) {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      const url = new URL(request.url);
      expect(request.method).toBe("GET");
      expect(url.searchParams.get("limit")).toBe(limit);
      expect(url.searchParams.get("order")).toBe(order);
      expect(url.searchParams.get("number")).toBe(number);
      expect(url.searchParams.get("name")).toBe(name);
      expect(url.searchParams.get("count")).toBe(count);
      expect(url.pathname).toBe(`/api/v1/api-explorer/${endpoint}/preview`);
      return Response.json(body, { status, headers });
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
  const number = "00'A & B+#";
  expect(await loadItemPreview(new AbortController().signal, { limit: 1, order: "displayName desc", number },
    clientReturning(rows, 200, "items", "1", "displayName desc", number)))
    .toEqual(rows);
});

test("passes name and count params and reads X-Total-Count header when present", async () => {
  const rows = [{ id: "00000000-0000-4000-8000-000000000001", number: "C01", displayName: "Adatum" }];
  let totalCount: number | null = null;
  const result = await loadCustomerPreview(
    new AbortController().signal,
    { limit: 5, name: "Adatum", count: true },
    clientReturning(rows, 200, "customers", "5", null, null, "Adatum", "true", { "X-Total-Count": "42" }),
    total => { totalCount = total; },
  );
  expect(result).toEqual(rows);
  expect(totalCount).toBe(42);

  let absentCount: number | null = 99;
  await loadItemPreview(
    new AbortController().signal,
    { limit: 2 },
    clientReturning(rows, 200, "items", "2"),
    total => { absentCount = total; },
  );
  expect(absentCount).toBeNull();
});
