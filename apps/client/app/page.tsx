import { OverworldGame } from "@/components/OverworldGame";

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">TACTIMON ONLINE</span>
          <h1>Overworld Prototype</h1>
        </div>
        <div className="build-badge">Kanto · v0.1</div>
      </header>

      <section className="game-card" aria-label="Tactimon overworld">
        <OverworldGame />
      </section>

      <footer className="footer-note">
        Primeiro slice: Pallet Town, movimento 4-dir, colisão e câmera.
      </footer>
    </main>
  );
}
