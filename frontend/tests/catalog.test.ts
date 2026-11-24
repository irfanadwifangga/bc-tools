import { expect, test } from "bun:test";
import { filterEndpoints, type CatalogEntity } from "../src/features/api-explorer/catalog";

const entities: CatalogEntity[] = ["customers", "customerPayments", "items"].map(name => ({
  name, entity_type: `Demo.${name}`, fields: [],
}));

test("search uses endpoint names, ignores case and surrounding spaces", () => {
  expect(filterEndpoints(entities, " CUSTOMER ")).toEqual(entities.slice(0, 2));
  expect(filterEndpoints(entities, "Demo")).toEqual([]);
  expect(filterEndpoints(entities, "")).toEqual(entities);
});
