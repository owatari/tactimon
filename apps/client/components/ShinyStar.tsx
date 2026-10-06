import { t } from "@/lib/i18n";

/** Gold star marking a shiny Pokémon next to its name. */
export function ShinyStar() {
  return (
    <span className="shiny-star" role="img" aria-label={t("Shiny")} title={t("Shiny")}>
      ★
    </span>
  );
}
