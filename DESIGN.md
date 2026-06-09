# PHASELANE — Design Document (v2 reboot)

*A quick, readable, turn-based space strategy game. A full game in 20 minutes, playable alone in a browser tab, with real decisions every turn.*

> This document replaces the design implied by `SPECIFICATION.md`, which describes the legacy
> real-time multiplayer prototype. The legacy doc is kept for reference; nothing in it is binding.

---

## 1. Post-mortem: why v1 didn't click

Before designing v2, an honest accounting of v1 (the code in this repo):

1. **Real-time multiplayer-only meant there was no one to play with.** The game required two
   simultaneous humans connected through Netlify + Render free tiers. You couldn't even playtest
   it alone. The commit history tells the story: nearly every commit is a connection, identity,
   or CORS fix — almost none are gameplay.
2. **The strategy was one number.** Fleets were a single `strength` scalar; planets a single
   `population` scalar. With no ship types, no economy choices, and no terrain that mattered,
   optimal play collapsed to "build the biggest blob, send it at the weakest planet."
3. **Slow real-time with nothing to decide.** At 1-second ticks and 5% lane progress per tick,
   a fleet took 20 real seconds to cross one lane — and the player had no meaningful decisions
   to make while waiting. Real-time pacing without real-time decisions is just waiting.
4. **Combat had no drama or counterplay.** Mutual 10% attrition per tick means the bigger blob
   always wins, slowly, with no way to outplay it.
5. **The architecture was too heavy for a prototype.** TypeORM writes per entity per tick, a
   split client/server deployment across two hosting providers, a parallel `server-deploy`
   re-implementation, and a demo-mode fallback. Most engineering effort went into plumbing
   rather than fun.

Every v2 decision below is downstream of one of these five failures.

## 2. Design pillars

1. **Playable in 10 seconds, alone.** Open a URL, click "New Game", you're playing against an
   AI. No server, no login, no second human required. Ever.
2. **A complete game in ~20 minutes.** 20–40 turns. Win conditions designed to end games, not
   prolong them.
3. **Every turn is a real decision.** Limited money, limited moves, asymmetric planets, and a
   counter triangle mean "what do I build and where do I send it" is never trivial.
4. **Readable depth.** Everything visible (no fog of war), deterministic combat you can count
   before committing. Chess in space, not a spreadsheet.
5. **The engine is a pure function.** Turn-based + deterministic means the whole game core is
   testable, replayable, and trivially extensible to hotseat and async multiplayer later.

## 3. The game in one paragraph

You and an AI faction each start with a fortified **Capital** on opposite sides of a small map
of ~15 planets connected by **phase lanes**. Planets generate credits; credits buy ships from a
three-class counter triangle (Corvette > Dreadnought > Cruiser > Corvette); ships move along
lanes one hop per turn and capture undefended planets. You win by **capturing the enemy Capital**
or by **holding the central Nexus planet for 5 (cumulative) turns** — so turtling at home loses
to an opponent who takes the middle.

## 4. Core loop (one turn ≈ 30–60 seconds)

1. **Income** — collect credits from every planet you own.
2. **Build** — spend credits on ships at any planet with a shipyard (they appear immediately,
   but can't move until next turn).
3. **Move** — order each of your fleets along a lane (most ships: 1 hop; Corvettes: 2 hops).
4. **End turn** — the AI takes its turn, then resolution happens in order:
   combats resolve at every contested planet → undefended planets in enemy orbit flip →
   Nexus counters tick → victory check.

No "waiting" state exists anywhere in the design.

## 5. Systems

### 5.1 Map

A hand-tuned graph of **13–17 planets** (nodes) and phase lanes (edges), mirrored for fairness,
with a seed-driven decoration pass so maps feel varied. Lanes are the only way to move; the
graph's chokepoints ARE the terrain.

Planet types:

| Type | Income | Special |
|---|---|---|
| **Capital** (1 per player) | 3 | Shipyard. Defense battery (fires every combat round on defense). Lose it = lose the game. |
| **Forge** | 1 | Shipyard — forward production is how you keep pressure on. |
| **Rich** | 3 | Pure money. Juicy, hard-to-defend raid targets. |
| **Bastion** | 1 | Defense battery for whoever owns it. Natural strongpoint. |
| **Relay** | 1 | Fleets moving out of a Relay get +1 movement that turn. Creates fast corridors. |
| **Nexus** (1, center) | 2 | Hold at end of turn → +1 to your Nexus counter. First to 5 wins. |
| Standard | 1 | — |

Neutral planets start undefended or with a small neutral garrison (tuning knob — garrisons slow
the early land-grab and make Corvettes worth building turn 1).

### 5.2 Ships — the counter triangle

Three classes. Each deals **double damage** to the class it counters.

| Class | Cost | Move | Attack | Hull | Counters | Role |
|---|---|---|---|---|---|---|
| **Corvette** | 2 | 2 | 1 | 1 | Dreadnought | Fast capture, raids, swarming big ships |
| **Cruiser** | 5 | 1 | 3 | 3 | Corvette | The line ship; sweeps swarms |
| **Dreadnought** | 12 | 1 | 6 | 8 | Cruiser | Breaks fleets and Bastions; siege bonus: ignores defense batteries |

Corvette > Dreadnought > Cruiser > Corvette. You can always read the enemy's composition on the
map and answer it — that's the central skill loop. No upgrades, no XP, no tech tree in v1: the
depth comes from *where* things are, not stat stacking.

### 5.3 Combat

Triggered when opposing ships occupy the same planet after moves. Resolution is **deterministic
and simultaneous**, in rounds, until one side is destroyed:

- Each round, each side's total attack (with counter multipliers) is dealt to the opposing
  fleet; damage auto-targets countered classes first, then cheapest ships first.
- Defense batteries (Capital/Bastion) add their attack to the defender every round — unless the
  attacker has a Dreadnought (siege).
- The full exchange resolves in a single turn and is replayed to the player as a fast, punchy
  round-by-round ticker (~2 seconds), so fights feel like events, not bookkeeping.

Deterministic means you can count a fight before committing to it — and so can the AI, which
makes its threats legible. (A "tactics variance" knob is a deliberate later experiment, not v1.)

### 5.4 Capture & economy

- End a turn with ships at a planet that has no enemy ships → it's yours. Income starts next turn.
- One currency: **credits**. No maintenance, no food, no happiness. The build/save decision and
  the triangle carry the economy.
- Losing your last shipyard doesn't eliminate you (you still have your Capital by definition —
  losing *that* is the elimination).

### 5.5 Victory

1. **Decapitation** — capture the enemy Capital.
2. **Nexus control** — 5 cumulative end-of-turns holding the Nexus.

Both are loud, visible clocks (Nexus counters live in the top bar). The Nexus rule is the
anti-turtle mechanism: sitting on your battery-fortified Capital is safe, but the game will end
without you.

### 5.6 AI

Utility-based, per-turn scoring — no search tree needed at this scale:

1. Is my Capital threatened within 2 hops? → defend.
2. Can I win or deny a Nexus tick? → contest the middle.
3. Can I capture an undefended planet this turn (weighted by income/type)? → take it.
4. Can I win a countable fight with local superiority? → attack.
5. Otherwise → build toward countering the player's visible composition, rally toward the front.

Because combat is deterministic and there's no fog, the AI evaluates fights exactly — it never
needs to cheat with information. Difficulty levels adjust its income bonus and how many of the
above rules it's allowed to use. Personalities (Aggressor / Turtle / Opportunist) are an M2
flavor layer: same evaluator, different weights.

### 5.7 Juice (cheap, high-leverage)

- Lane pulse animation on every move; planet ownership flips with a color bloom.
- The combat ticker (5.3) with screen-shake on Dreadnought hits.
- Parallax starfield background. Sound effects in M2.
- End-of-game summary screen: timeline of planets owned, biggest battle, turn count.

## 6. UX

One screen. The map is 90% of it.

- **Top bar:** turn number, credits + income, both players' Nexus counters (the game clock).
- **Map:** click a fleet → reachable planets highlight → click destination. Click a shipyard
  planet → build buttons with costs right on the panel. Big hit targets; works on a phone.
- **Right panel:** contents of the selected planet (ships by class, income, special).
- **End Turn:** one big button. The AI turn + resolution plays out visibly in ~2–4 seconds.
- New game flow: difficulty pick (Easy / Normal / Hard) → play. Nothing else between the player
  and turn 1. Autosave to localStorage every turn; "Continue" on the title screen.

## 7. Technical architecture

Designed as the *opposite* of v1's stack:

| | v1 (legacy) | v2 |
|---|---|---|
| Topology | Client + Socket.IO server + DB, 2 hosts | **Single static web app. No server. No DB. No sockets.** |
| Simulation | 1s tick loop, ORM writes per entity per tick | **Pure-function engine: `resolveTurn(state, orders) → state`** |
| Multiplayer | Required, real-time | None in v1; hotseat free; async later via order exchange |
| Testing | Effectively none | Engine is deterministic + seeded RNG → unit-test everything |

Concretely:

- **One package.** Vite + React + TypeScript. The monorepo, `server-deploy/`, and `netlify/`
  trees from v1 are not carried forward.
- **`src/engine/`** — pure TypeScript, zero React/DOM imports: types, map generation (seeded),
  order validation, combat resolution, AI. Every rule in this document lands here with a vitest
  test next to it. This is where most of the work and all of the correctness lives.
- **`src/ui/`** — React + Zustand. The map renders as **SVG** (15 nodes doesn't need canvas;
  SVG gives free hit-testing, CSS animation, and accessibility).
- **Persistence:** localStorage (autosave + settings). **Deploy:** GitHub Pages or Netlify
  static — push to deploy, nothing to keep alive.
- **Multiplayer path (explicitly deferred):** the engine signature already supports it —
  hotseat is "two humans submit orders", async online is "exchange serialized orders through a
  dumb relay or a share-URL". We do not build any of it until single-player is fun.

## 8. Milestones

**M0 — Walking skeleton.** Fixed map, income, build Cruisers only, move, capture, deterministic
combat (one class), greedy-capture AI, Capital win, autosave. *Exit test: you can sit down and
play a complete, winnable game.*

**M1 — Make it a game.** Full triangle + counters, all planet types, defense batteries + siege,
Nexus victory, the real AI evaluator, combat ticker, difficulty levels. *Exit test: someone who
isn't us plays two games in a row without being asked to.*

**M2 — Juice & variety.** Seeded map variations, AI personalities, sound, end-game summary,
hotseat mode, balance pass from playtests. *Stretch: 3–4 faction free-for-all (the engine is
N-player from day one), random events.*

## 9. Non-goals (so v1's scope creep stays dead)

- No real-time anything. No servers, accounts, databases, or WebSockets.
- No tech trees, ship upgrades, diplomacy, espionage, or fog of war.
- No 3D, no canvas/WebGL engine work.
- No online multiplayer until M2 is done and the single-player game is demonstrably fun.

## 10. Open questions (to settle by playing, not debating)

1. Neutral garrisons on/off, and how big — pace of the early game.
2. Exact triangle multiplier (×2 vs ×1.5) and Dreadnought cost — the "blob anyway" risk.
3. Nexus target (5 ticks?) and whether ticks require *surviving* a contest that turn.
4. Whether defenders may retreat (adds decisions, adds rules — test in M1).
5. Map size sweet spot: 13 nodes plays fast, 17 plays deep.
