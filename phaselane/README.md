# PHASELANE (v2 prototype)

Real-time territorial.io-style space strategy against AI factions.
See `../DESIGN.md` for the full design. Everything runs client-side —
no server, no accounts.

**Play the latest build:** https://alexbbio.github.io/space-strategy-game/
(auto-deployed by `.github/workflows/pages.yml` on every push).

## Run it

```
npm install
npm run dev      # dev server at http://localhost:5173
```

## Test & build

```
npm test         # engine unit tests (vitest)
npm run build    # typecheck + production build + dist/phaselane.html
```

`dist/phaselane.html` is a single self-contained file — open it directly
in any browser, no server needed.

## Layout

- `src/engine/` — pure TypeScript simulation (no React/DOM): map generation,
  economy, fronts/combat, bots. Deterministic per seed, fixed 10 ticks/s.
- `src/ui/` — React HUD + Canvas map renderer driving the engine via
  `requestAnimationFrame`.
