import { GameClient } from "@/components/GameClient";

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">TACTIMON ONLINE</span>
          <h1>Kanto Overworld</h1>
        </div>
        <div className="build-badge">
          Pallet · Route 1 · Wild battles · Progressão
        </div>
      </header>

      <section className="game-card" aria-label="Tactimon game client">
        <GameClient />
      </section>

      <footer className="footer-note">
        Overworld + batalha tática + encontros selvagens + progressão inicial.
      </footer>
    </main>
  );
}
