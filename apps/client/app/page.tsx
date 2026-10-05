import { GameClient } from "@/components/GameClient";

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="game-card" aria-label="Tactimon game client">
        <GameClient />
      </section>
    </main>
  );
}
