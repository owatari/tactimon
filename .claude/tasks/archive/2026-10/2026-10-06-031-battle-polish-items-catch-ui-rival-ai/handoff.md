# Handoff — task 031
**Mudou:** Revive 7 / Full Restore 8 / Max Revive 9 AP; Pokémon caído entra na luta e pode ser revivido; hover com Ball mostra "Catch NN%" (`captureChanceFor`); animação de captura completa antes do fim de batalha; raridade do Auto Catch por aparição na área (`rarity.ts`, `appearanceRate`) + bônus curado; IA do rival usa a bolsa inteira e `trainerBag` define bolsas por tipo de treinador; docs em `.claude/knowledge/battle-system.md`.
**Testar:** `pnpm test`, `pnpm e2e:walkthrough` (E13), `pnpm e2e:playthrough`; em batalha selvagem escolha Item → Poké Ball e passe o mouse num selvagem.
**Pendências:** IA de golpes/movimentação não foi reescrita (só itens); câmera não segue a unidade ativa; task 027 (tela de captura em tabela + ícones de tipo) segue planejada.
