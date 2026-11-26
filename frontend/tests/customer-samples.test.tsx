import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SampleCode } from "../src/features/api-explorer/SampleCode";
import { EndpointRow } from "../src/features/api-explorer/CatalogPage";
import { getCodeSample } from "../src/features/api-explorer/customerSamples";

for (const language of ["Python", "C#"] as const) {
  test(`${language} includes the selected order and leaves it out by default`, () => {
    const expected = language === "Python" ? '"$orderby": "displayName desc"' : "$orderby=displayName%20desc";
    for (const endpoint of ["customers", "items"] as const) {
      expect(getCodeSample(endpoint, language, 2, "displayName desc")).toContain(expected);
      expect(getCodeSample(endpoint, language, 2)).not.toContain("$orderby");
    }
  });

  test(`customer GET sample for ${language}`, () => {
    expect(getCodeSample("customers", language)).toMatchSnapshot();
  });

  test(`item GET sample for ${language} changes only the resource path`, () => {
    const customerSample = getCodeSample("customers", language);
    const itemSample = getCodeSample("items", language);
    expect(customerSample).toContain("/customers");
    expect(itemSample).toContain("/items");
    expect(itemSample).not.toContain("/customers");
    expect(itemSample.replace("/items", "/customers")).toBe(customerSample);
  });
}

for (const language of ["Python", "C#"] as const) {
  test(`${language} uses the selected limit for both endpoints`, () => {
    const expected = language === "Python" ? '"$top": 2' : "$top=2";
    for (const endpoint of ["customers", "items"] as const) {
      expect(getCodeSample(endpoint, language, 2)).toContain(expected);
    }
  });

  test(`highlighted ${language} preserves the full copyable source`, () => {
    const text = getCodeSample("items", language, 2);
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

test("only customers and items offer copyable examples without loading previews", () => {
  const row = (name: string) => renderToStaticMarkup(<EndpointRow
    entity={{ name, entity_type: name, fields: [] }} open query="" onSelect={() => {}} />);
  for (const endpoint of ["customers", "items"]) {
    const html = row(endpoint);
    expect(html).toContain("Contoh kode GET");
    expect(html).toContain(">Salin kode</span>");
    expect(html).toContain("Lihat contoh data");
    expect(html).toContain("/" + endpoint);
  }
  expect(row("vendors")).not.toContain("Contoh kode GET");
});
