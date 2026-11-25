import { expect, test } from "bun:test";
import { filterEndpoints, type CatalogEntity } from "../src/features/api-explorer/catalog";

const entities: CatalogEntity[] = ["customers", "customerPayments", "items"].map(name => ({
  name, entity_type: `Demo.${name}`, fields: [],
}));

test("search finds endpoints by field name once per endpoint", () => {
  const field = (name: string) => ({ name, type: "Edm.String" });
  const catalog = [
    { ...entities[0], fields: [field("postalCode"), field("postalAddress")] },
    entities[1],
    { ...entities[2], fields: [field("shippingPostalCode")] },
  ];
  expect(filterEndpoints(catalog, " PoStAl ")).toEqual([catalog[0], catalog[2]]);
  expect(filterEndpoints(catalog, "Edm.String")).toEqual([]);
});

test("search uses endpoint names, ignores case and surrounding spaces", () => {
  expect(filterEndpoints(entities, " CUSTOMER ")).toEqual(entities.slice(0, 2));
  expect(filterEndpoints(entities, "Demo")).toEqual([]);
  expect(filterEndpoints(entities, "")).toEqual(entities);
});
