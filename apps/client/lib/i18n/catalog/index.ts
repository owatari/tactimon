import type { Catalog } from "../index";
import { battleCatalog } from "./battle";
import { battleLogCatalog } from "./battle-log";
import { dialoguesCatalog } from "./dialogues";
import { fieldCatalog } from "./field";
import { itemsCatalog } from "./items";
import { namesCatalog } from "./names";
import { optionsCatalog } from "./options";
import { captureCatalog } from "./capture";
import { naturesCatalog } from "./natures";
import { pokedexCatalog } from "./pokedex";
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
  ...captureCatalog,
  ...naturesCatalog,
  ...pokedexCatalog,
  ...battleCatalog,
  ...battleLogCatalog,
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
