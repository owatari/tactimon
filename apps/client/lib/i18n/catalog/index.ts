import type { Catalog } from "../index";
import { battleCatalog } from "./battle";
import { dialoguesCatalog } from "./dialogues";
import { fieldCatalog } from "./field";
import { itemsCatalog } from "./items";
import { namesCatalog } from "./names";
import { optionsCatalog } from "./options";
import { questsCatalog } from "./quests";
import { trainersHandCatalog } from "./trainers-hand";
import { trainersKantoCatalog } from "./trainers-kanto";
import { uiCatalog } from "./ui";
import { worldNpcHandCatalog } from "./world-npc-hand";
import { worldNpcKantoCatalog } from "./world-npc-kanto";
import { worldSignsCatalog } from "./world-signs";

/** Every catalog domain file registers its entries here. */
export const CATALOG: Catalog = {
  ...optionsCatalog,
  ...fieldCatalog,
  ...uiCatalog,
  ...battleCatalog,
  ...dialoguesCatalog,
  ...questsCatalog,
  ...itemsCatalog,
  ...namesCatalog,
  ...worldNpcKantoCatalog,
  ...worldNpcHandCatalog,
  ...worldSignsCatalog,
  ...trainersKantoCatalog,
  ...trainersHandCatalog,
};
