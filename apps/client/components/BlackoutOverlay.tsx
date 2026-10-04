"use client";

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
  return (
    <div className="mart-overlay">
      <section className="mart-panel">
        <div className="mart-header">
          <div>
            <span className="eyebrow">
              BLACKOUT
            </span>
            <h2>Seu time não consegue mais lutar.</h2>
          </div>
          <strong>HP restaurado</strong>
        </div>

        <p className="mart-copy">
          Você será levado para {locationLabel}.
        </p>

        <p className="mart-copy">
          {moneyLost > 0
            ? `Você perdeu ₽${moneyLost.toLocaleString("pt-BR")}.`
            : "Você não perdeu dinheiro."}
        </p>

        <button
          type="button"
          className="mart-close"
          onClick={onContinue}
        >
          Continuar
        </button>
      </section>
    </div>
  );
}
