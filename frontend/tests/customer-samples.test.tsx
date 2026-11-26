import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SampleCode } from "../src/features/api-explorer/SampleCode";
import { EndpointDetail } from "../src/features/api-explorer/CatalogPage";
import { PageHeader } from "../src/components/PageHeader";
import { getCodeSample, getEntityCodeSample } from "../src/features/api-explorer/customerSamples";

test("number filter preserves leading zeros and escapes content in both languages", () => {
  const number = "00'A & B+#" + String.fromCharCode(34, 92);
  const filter = "number eq '00''A & B+#" + String.fromCharCode(34, 92) + "'";
  for (const endpoint of ["customers", "items"] as const) {
    const python = getCodeSample(endpoint, "Python", 2, "number asc", number);
    expect(python).toContain('"$filter": ' + JSON.stringify(filter));
    const csharp = getCodeSample(endpoint, "C#", 2, "number asc", number);
    expect(decodeURIComponent(csharp.split("&$filter=")[1].split('"')[0])).toBe(filter);
    expect(getCodeSample(endpoint, "Python", 2, undefined, " ")).not.toContain("$filter");
  }
});

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
  const detail = (name: string) => renderToStaticMarkup(<EndpointDetail
    entity={{ name, entity_type: name, fields: [] }} query="" />);
  for (const endpoint of ["customers", "items"]) {
    const html = detail(endpoint);
    expect(html).toContain("Struktur field");
    expect(html).toContain("Preview Data");
    expect(html).toContain("Contoh Kode GET");
    expect(html).toContain(">Salin kode</span>");
    expect(html).toContain("Lihat contoh data");
    expect(html).toContain("ant-btn-primary");
    expect(html).toContain("anticon-eye");
    expect(html).toContain("Field ($select)");
    expect(html).toContain("Jumlah baris");
    expect(html).toContain("Urutkan");
    expect(html).toContain("Nomor");
    expect(html).toContain("Nama");
    expect(html).toContain("Jumlah total ($count)");
    expect(html).toContain("anticon-ordered-list");
    expect(html).toContain("anticon-sort-ascending");
    expect(html).toContain("anticon-filter");
    expect(html).toContain("/" + endpoint);
  }
  const vendorHtml = detail("vendors");
  expect(vendorHtml).toContain("Struktur field");
  expect(vendorHtml).not.toContain("Preview Data");
  expect(vendorHtml).toContain("Contoh Kode GET");
  expect(vendorHtml).toContain("/vendors");
});

test("selected fields update $select and object projection in both languages", () => {
  const python = getCodeSample("customers", "Python", 2, undefined, undefined, ["number"]);
  expect(python).toContain('fields = ("number",)');
  expect(python).toContain('"$select": ",".join(fields)');
  const csharp = getCodeSample("items", "C#", 2, undefined, undefined, ["id", "displayName"]);
  expect(csharp).toContain("?$top=2&$select=id,displayName\"");
  expect(csharp).toContain('id = row.GetProperty("id").GetString()');
  expect(csharp).toContain('displayName = row.GetProperty("displayName").GetString()');
  expect(csharp).not.toContain('GetProperty("number")');
});

test("PageHeader renders centered heading and optional description", () => {
  const html = renderToStaticMarkup(<PageHeader title="API Explorer" description="Ringkas" titleId="t" />);
  expect(html).toContain("page-header--center");
  expect(html).toContain("API Explorer");
  expect(html).toContain("Ringkas");
});

test("custom customers shows its fields and GET sample without preview controls", () => {
  const html = renderToStaticMarkup(<EndpointDetail
    entity={{ name: "customers", entity_type: "Demo.Customer", source: "custom",
      fields: [{ name: "customNumber", type: "Edm.String" }] }}
    query="" />);
  expect(html).toContain("Demo.Customer");
  expect(html).toContain("customNumber");
  expect(html).not.toContain("Lihat contoh data");
  expect(html).not.toContain("Preview Data");
  expect(html).toContain("Contoh Kode GET");
  expect(html).toContain("BC_CUSTOM_API_ROUTE");
});

test("name filter and $count update Python and C# samples", () => {
  const pyName = getCodeSample("customers", "Python", 5, undefined, undefined, undefined, "O'Brien");
  expect(pyName).toContain('"$filter": "contains(displayName,\'O\'\'Brien\')"');

  const csBoth = getCodeSample("items", "C#", 3, undefined, "100", undefined, "Desk", true);
  expect(decodeURIComponent(csBoth.split("&$filter=")[1].split("&")[0]))
    .toBe("number eq '100' and contains(displayName,'Desk')");
  expect(csBoth).toContain("&$count=true\"");
  expect(csBoth).toContain('TryGetProperty("@odata.count"');

  const pyCount = getCodeSample("customers", "Python", 5, undefined, undefined, undefined, undefined, true);
  expect(pyCount).toContain('"$count": "true"');
  expect(pyCount).toContain('"@odata.count"');
});

test("generic standard endpoints generate Python and C# GET samples with special companies path", () => {
  const vendors = {
    name: "vendors",
    entity_type: "Microsoft.NAV.vendor",
    fields: ["id", "number", "displayName", "city", "email", "extraField"].map(name => ({ name, type: "Edm.String" })),
  };
  const pyVendors = getEntityCodeSample(vendors, "Python");
  expect(pyVendors).toContain('f"{url}/vendors"');
  expect(pyVendors).toContain('fields = ("id", "number", "displayName", "city", "email")');
  expect(pyVendors).not.toContain("extraField");
  expect(pyVendors).toContain('"$top": 5');

  const csVendors = getEntityCodeSample(vendors, "C#");
  expect(csVendors).toContain('url + "/vendors?$top=5&$select=id,number,displayName,city,email"');
  expect(csVendors).not.toContain("extraField");

  const emptyEntity = { name: "dimensions", entity_type: "Microsoft.NAV.dimension", fields: [] };
  expect(getEntityCodeSample(emptyEntity, "Python")).toContain('f"{url}/dimensions", params={"$top": 5}');
  expect(getEntityCodeSample(emptyEntity, "C#")).toContain('url + "/dimensions?$top=5"');

  const companies = {
    name: "companies",
    entity_type: "Microsoft.NAV.company",
    fields: [{ name: "id", type: "Edm.Guid" }, { name: "name", type: "Edm.String" }],
  };
  const pyCompanies = getEntityCodeSample(companies, "Python");
  expect(pyCompanies).toContain('/api/v2.0/companies"');
  expect(pyCompanies).not.toContain("companies({company})/");

  const csCompanies = getEntityCodeSample(companies, "C#");
  expect(csCompanies).toContain('/api/v2.0/companies";');
  expect(csCompanies).not.toContain("companies({company})/");
});

test("custom API endpoints read BC_CUSTOM_API_ROUTE from env in Python and C#", () => {
  const custom = {
    name: "customOrders",
    entity_type: "Custom.Order",
    source: "custom" as const,
    fields: [{ name: "id", type: "Edm.Guid" }, { name: "orderNo", type: "Edm.String" }],
  };
  const pyCustom = getEntityCodeSample(custom, "Python");
  expect(pyCustom).toContain('os.environ["BC_CUSTOM_API_ROUTE"]');
  expect(pyCustom).toContain("/api/{route}/companies({company})/customOrders");
  expect(pyCustom).toContain('fields = ("id", "orderNo")');

  const csCustom = getEntityCodeSample(custom, "C#");
  expect(csCustom).toContain('Required("BC_CUSTOM_API_ROUTE")');
  expect(csCustom).toContain("/api/{route}/companies({company})");
  expect(csCustom).toContain('/customOrders?$top=5&$select=id,orderNo"');
});
