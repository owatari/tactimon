import type { Catalog } from "../index";
import { fieldCatalog } from "./field";
import { optionsCatalog } from "./options";

/** Every catalog domain file registers its entries here. */
export const CATALOG: Catalog = {
  ...optionsCatalog,
  ...fieldCatalog,
};
