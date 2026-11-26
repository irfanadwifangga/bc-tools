import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EndpointDetail, EndpointRow } from "../src/features/api-explorer/CatalogPage";

const entity = {
  name: "postalContacts", entity_type: "Demo.contact",
  fields: ["shipPostalCode", "postalPostal", "city"].map(name => ({ name, type: "Edm.String" })),
};

function row(open: boolean, query: string) {
  return renderToStaticMarkup(<EndpointRow entity={entity} open={open} query={query} onSelect={() => {}} />);
}

test("closed result shows the matching endpoint text and first matching field", () => {
  const html = row(false, "postal");
  expect(html).toContain("<mark>postal</mark>Contacts");
  expect(html).toContain("ship<mark>Postal</mark>Code");
  expect(html).not.toContain("postalPostal");
});

test("expanded detail marks all matches and keeps unrelated fields visible", () => {
  const html = renderToStaticMarkup(<EndpointDetail entity={entity} query="postal" />);
  expect(html).toContain("<mark>postal</mark><mark>Postal</mark>");
  expect(html).toContain("<td>city</td>");
  expect(row(false, "")).not.toContain("catalog-field-hint");
  expect(renderToStaticMarkup(<EndpointDetail entity={entity} query="" />)).not.toContain("<mark>");
});
