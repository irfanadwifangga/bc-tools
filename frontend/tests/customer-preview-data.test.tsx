import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerPreviewData, JsonCode } from "../src/features/api-explorer/CustomerPreviewData";

const rows = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  number: `TEST-0${i + 1}`,
  displayName: `Contoh <${i + 1}>`,
}));

test("renders five customers as a table or escaped, indented JSON", () => {
  const table = renderToStaticMarkup(<CustomerPreviewData rows={rows} format="Tabel" />);
  const json = renderToStaticMarkup(<CustomerPreviewData rows={rows} format="JSON" />);
  expect(table.match(/<tbody>[\s\S]+<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(5);
  expect(table).not.toContain("Salin JSON");
  expect(json).toContain(">Salin JSON</span>");
  expect(json).toContain("<code>[\n  {\n");
  for (const row of rows) {
    expect(json).toContain(row.id);
    expect(json).toContain(row.number);
  }
  expect(json).toContain("Contoh &lt;5&gt;");
});

test("highlights field names and strings without changing the serialized JSON", () => {
  const sample = [{ ...rows[0], displayName: 'Contoh "A": <&> \\ arsip\nBaru' }];
  const markup = renderToStaticMarkup(<CustomerPreviewData rows={sample} format="JSON" />);
  const code = markup.match(/<code>[\s\S]*?<\/code>/)?.[0];
  const plain = renderToStaticMarkup(<code>{JSON.stringify(sample, null, 2)}</code>);
  expect(code?.replace(/<span class="json-(?:key|string)">|<\/span>/g, "")).toBe(plain);
  expect(code).toContain('<span class="json-key">&quot;displayName&quot;</span>: ');
  expect(code?.match(/class="json-string"/g)).toHaveLength(3);
});

test("distinguishes quoted numbers from JSON numbers and other literals", () => {
  const markup = renderToStaticMarkup(<JsonCode text={'{"number":"10000","count":-2.6e+3,"ok":true,"next":null}'} />);
  expect(markup).toContain('<span class="json-string">&quot;10000&quot;</span>');
  for (const literal of ["-2.6e+3", "true", "null"]) {
    expect(markup).toContain('<span class="json-literal">' + literal + '</span>');
  }
});

test("renders an empty response as a JSON array", () => {
  const json = renderToStaticMarkup(<CustomerPreviewData rows={[]} format="JSON" />);
  expect(json).toContain(">Salin JSON</span>");
  expect(json).toContain("<code>[]</code>");
  expect(renderToStaticMarkup(<CustomerPreviewData rows={[]} format="Tabel" />)).toBe("");
});
