import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SampleCode } from "../src/features/api-explorer/SampleCode";
import { EndpointRow } from "../src/features/api-explorer/CatalogPage";
import { customerSamples } from "../src/features/api-explorer/customerSamples";

for (const language of ["Python", "C#"] as const) {
  test(`customer GET sample for ${language}`, () => {
    expect(customerSamples[language]).toMatchSnapshot();
  });
}

for (const language of ["Python", "C#"] as const) {
  test(`highlighted ${language} preserves the full copyable source`, () => {
    const text = customerSamples[language];
    const html = renderToStaticMarkup(<SampleCode text={text} language={language} />);
    expect(html.replace(/<span class="sample-\w+">|<\/span>/g, ""))
      .toBe(renderToStaticMarkup(<code>{text}</code>));
    const call = language === "Python" ? "getenv" : "GetStringAsync";
    expect(html).toContain(`<span class="sample-call">${call}</span>(`);
    const keyword = language === "Python" ? "import" : "using";
    expect(html).toContain(`<span class="sample-keyword">${keyword}</span>`);
    expect(html).toContain('<span class="sample-string">&quot;Sandbox&quot;</span>');
    expect(html).toContain('<span class="sample-literal">10' + (language === "Python" ? ".0" : "") + '</span>');
    expect(html).toContain('<span class="sample-comment">' + (language === "Python" ? "#" : "//"));
  });
}

test("only customers offers copyable examples without loading its data preview", () => {
  const row = (name: string) => renderToStaticMarkup(<EndpointRow
    entity={{ name, entity_type: name, fields: [] }} open query="" onSelect={() => {}} />);
  const customers = row("customers");
  expect(customers).toContain("Contoh kode GET");
  expect(customers).toContain(">Salin kode</span>");
  expect(customers).toContain("Lihat contoh data");
  expect(row("items")).toContain("Lihat contoh data");
  expect(row("items")).not.toContain("Contoh kode GET");
});
