import { OverworldGame } from "@/components/OverworldGame";

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">TACTIMON ONLINE</span>
          <h1>Kanto Overworld</h1>
        </div>
        <div className="build-badge">Pallet → Route 1 → Viridian</div>
      </header>

      <section className="game-card" aria-label="Tactimon overworld">
        <OverworldGame />
      </section>

      <footer className="footer-note">
        Overworld em construção: movimento contínuo, camadas reais do FireRed,
        colisão e conexões entre mapas.
      </footer>
    </main>
  );
}
