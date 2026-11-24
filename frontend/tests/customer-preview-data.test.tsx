import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerPreviewData } from "../src/features/api-explorer/CustomerPreviewData";

const rows = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  number: `TEST-0${i + 1}`,
  displayName: `Contoh <${i + 1}>`,
}));

test("renders five customers as a table or escaped, indented JSON", () => {
  const table = renderToStaticMarkup(<CustomerPreviewData rows={rows} format="Tabel" />);
  const json = renderToStaticMarkup(<CustomerPreviewData rows={rows} format="JSON" />);
  expect(table.match(/<tbody>[\s\S]+<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(5);
  expect(json).toContain("<code>[\n  {\n");
  for (const row of rows) {
    expect(json).toContain(row.id);
    expect(json).toContain(row.number);
  }
  expect(json).toContain("Contoh &lt;5&gt;");
});

test("renders an empty response as a JSON array", () => {
  expect(renderToStaticMarkup(<CustomerPreviewData rows={[]} format="JSON" />))
    .toContain("<code>[]</code>");
  expect(renderToStaticMarkup(<CustomerPreviewData rows={[]} format="Tabel" />)).toBe("");
});
