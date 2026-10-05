# i18n catalog format

User-facing text is **English-keyed**: write `t("English text {param}", { param })` (or `tx("…")` in static
data that is shown later). Catalog files live in `apps/client/lib/i18n/catalog/<domain>.ts` and map the
source text to the other languages. The runner translates at display time (`runDialogueInteraction`
localizes every dialogue page, speaker and choice).

Entry format (one per entry, strings written with JSON quoting, keys sorted by first use):

```ts
  "Source text": {
    pt: "…",
    es: "…",
    fr: "…",
    zh: "…",
  },
```

* English-keyed entries need `pt`, `es`, `fr`, `zh`.
* **Legacy Portuguese literals** that still live in the code keep the Portuguese text as the key and give
  `en`, `es`, `fr`, `zh` instead (no code change needed; the runner translates them).
* Placeholders (`{name}`) must be identical in every language.
* Pokémon, move and item names are localized separately (`catalog/names.ts` + `lib/i18n/names.ts`).
* `python tools/i18n/inventory.py` lists Portuguese literals in the code; `python tools/i18n/audit.py`
  lists the ones missing from the catalogs.
