"use client";

import { t, useLocale } from "@/lib/i18n";

type Props = {
  moneyLost: number;
  locationLabel: string;
  onContinue: () => void;
};

export function BlackoutOverlay({
  moneyLost,
  locationLabel,
  onContinue,
}: Props) {
  useLocale();
  return (
    <div className="mart-overlay">
      <section className="mart-panel">
        <div className="mart-header">
          <div>
            <span className="eyebrow">
              {t("BLACKOUT")}
            </span>
            <h2>{t("Your team can no longer fight.")}</h2>
          </div>
          <strong>{t("HP restored")}</strong>
        </div>

        <p className="mart-copy">
          {t("You will be taken to {location}.", {
            location: t(locationLabel),
          })}
        </p>

        <p className="mart-copy">
          {moneyLost > 0
            ? t("You lost ₽{money}.", {
                money: moneyLost.toLocaleString("pt-BR"),
              })
            : t("You did not lose any money.")}
        </p>

        <button
          type="button"
          className="mart-close"
          onClick={onContinue}
        >
          {t("Continue")}
        </button>
      </section>
    </div>
  );
}
