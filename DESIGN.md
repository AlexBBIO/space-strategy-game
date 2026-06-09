# PHASELANE — Design Document (v2 reboot)

*Territorial.io in space. A real-time galactic land-grab against a crowd of AI factions: one
resource, one slider, ten minutes of expanding, banking, backstabbing, and snowballing — playable
alone in a browser tab the moment it loads.*

> This document replaces the design implied by `SPECIFICATION.md`, which describes the legacy
> real-time multiplayer prototype. The legacy doc is kept for reference; nothing in it is binding.

---

## 1. Post-mortem: why v1 didn't click

Before designing v2, an honest accounting of v1 (the code in this repo):

1. **Real-time multiplayer-only meant there was no one to play with.** The game required two
   simultaneous humans connected through Netlify + Render free tiers. You couldn't even playtest
   it alone. The commit history tells the story: nearly every commit is a connection, identity,
   or CORS fix — almost none are gameplay.
2. **One number, no decisions.** Fleets were a single `strength` scalar with nothing to spend it
   on and no one to outplay. (Note: territorial.io is *also* a one-number game — the lesson is
   not "more numbers", it's that the one number needs constant, tense allocation decisions.)
3. **Slow real-time with nothing to decide.** 20 real seconds to cross one lane, with nothing to
   do while waiting. Real-time pacing without real-time decisions is just waiting.
4. **No drama.** Two players, symmetric blobs, mutual attrition. No shifting fronts, no third
   parties, no betrayal, no comeback.
5. **The architecture was too heavy for a prototype.** TypeORM writes per entity per tick, a
   split client/server deployment across two hosting providers, a parallel `server-deploy`
   re-implementation, and a demo-mode fallback. Most engineering effort went into plumbing.

v2 keeps real-time — it was never the problem — and fixes the other four.

## 2. Design pillars

1. **Playable in 10 seconds, alone.** Open the page, click Play, you're in a live FFA against
   10+ AI factions. No server, no login, no second human. Ever.
2. **One control.** Pick a target, set the slider, commit. All depth lives in *where, when, and
   how much* — never in menus, build queues, or unit micromanagement.
3. **The crowd is the content.** A dozen factions expanding, colliding, ganging up on the
   leader, and collapsing is what makes every game a story. Bots aren't filler; they're the game.
4. **A full game in 10–15 minutes**, with a readable arc: land-grab → border wars → snowball
   endgame.
5. **The engine is a deterministic fixed-timestep simulation.** Pure, testable, replayable —
   and lockstep-multiplayer-ready later without a rewrite.

## 3. The game in one paragraph

The galaxy is a graph of **60–90 planets** joined by **phase lanes**. You and **10–15 AI
factions** each start with one planet and a small **Power** balance. Power grows continuously
from the planets you own, plus **interest** on whatever you keep banked. To expand, you select a
planet adjacent to your territory, set your commitment slider (what % of your balance to send),
and attack: the committed force travels the lane and grinds down the defense; win and the planet
flips to your color. Neutral planets are cheap; other factions fight back at a defender's
advantage — and remember who hit them. Last faction standing wins, or first to control 65% of
the galaxy.

## 4. Core loop (continuous)

There are no turns. At any moment you are doing one of three things:

- **Expanding** — grabbing neutral planets while they're cheap. Every planet compounds your
  income, but every attack drains the balance that defends you.
- **Banking** — sitting on your balance to collect interest and look unappetizing. Bank too
  long and the map runs out of free land.
- **Fighting** — committing against a neighbor's planet, reinforcing a front that's crumbling,
  or piling onto a dying faction to take its land before the other vultures do.

The expand/bank tension (grow income vs. stay defended) is the heartbeat of territorial.io and
it ports to space intact. The phase-lane graph adds what the original lacks: **chokepoints** you
can hold cheaply and **fronts** with actual shape.

## 5. Systems

### 5.1 Power, income, and interest

Each faction has a single **Power** balance.

- **Income:** each owned planet adds income per second (base 1/s; specials below modify this).
- **Interest:** banked Power earns ~+1%/s, **capped** at a multiple of your income (so a giant
  bank can't grow forever without territory — territorial.io's anti-turtle rule, kept verbatim
  as a starting point).
- Power is spent only on attacks. No builds, no upkeep, no second currency.

### 5.2 Attacking and capturing

- You may target any planet **adjacent to your territory** (one lane from a planet you own).
- **The slider** (10–100%) sets how much of your current balance you commit. The committed
  Power leaves your balance immediately and becomes an **attack front** on that lane.
- The front grinds against the planet's **Defense** continuously over a few seconds:
  - *Neutral planets:* fixed garrison by planet size. Predictable, cheap, early-game food.
  - *Owned planets:* defense drains from the owner's balance automatically at a **defender's
    multiplier** (~1.5× efficiency, tuning knob), plus the planet's own defense bonus.
- Front Power > remaining defense → the planet **flips**; leftover force returns to your
  balance. Front exhausted first → attack fails; the defender keeps the planet and the scar.
- Multiple fronts may exist at once (including several factions attacking the same target —
  feeding frenzies around dying factions are a feature).
- **Fronts are irrevocable and non-interceptable.** This is load-bearing, not an omission:
  fleet-based lane games degenerate into endless fleet-chasing because offense is a movable
  piece and defense means physically intercepting it. Here, offense is a committed bet against
  a fixed place and defense is automatic from the balance — there is nothing to chase and no
  way to dodge. Any future mechanic that lets a front be recalled, redirected, or intercepted
  reintroduces the chase and should be rejected on sight.
- Capturing a faction's **last planet eliminates it**; nearby vultures race for the corpse's
  former territory (it reverts to weakly-garrisoned neutral).

### 5.3 The map

Seeded generation: 60–90 planets in loose **clusters** joined by sparse trunk lanes, so the
galaxy has regions, borders, and defensible passes rather than uniform mesh. Factions spawn
spread out, each with one planet and identical starting balance.

Planet specials (light, readable at a glance by icon):

| Type | Effect |
|---|---|
| **Rich** | 3× income. The planets wars start over. |
| **Bastion** | Strong defense bonus. Holds a chokepoint cheaply. |
| **Relay** | You may attack targets up to **2 lanes** away through it. Reach = power projection. |
| **Wormhole** (paired) | Adjacency to the partner wormhole across the map. Late-game backdoors. |
| **Nexus** (1, center) | 5× income, big garrison. The mid-game magnet and the endgame's engine. |
| Standard | — |

### 5.4 The bots

The product is the crowd, so bot behavior is where design effort goes after the core sim.
All bots run the same evaluator with different personality weights:

- **Expansionist** — grabs neutrals fast, over-extends, income-rich but thin.
- **Turtle** — banks heavily, holds Bastions, punishes attackers, slow to act.
- **Opportunist** — attacks whoever just spent their balance attacking someone else.
- **Vengeful** — remembers who attacked it; retaliation weight decays slowly.

Shared behaviors, all driven by visible state (bots never cheat with information — everything
is public anyway): expand while neutrals remain → probe the weakest neighbor → **dogpile dying
factions** → **gang up on the runaway leader** (soft rubber-banding that feels like politics,
not pity). Difficulty = income multiplier + how many behaviors are enabled.

### 5.5 Winning, losing, spectating

- **Win:** last faction standing, or first to **65% of planets** (ends games before mop-up).
- **Lose:** your last planet falls — then you **keep watching**: the camera lingers, the
  leaderboard keeps updating, and you see who wins the world that ate you. (Territorial.io gets
  enormous mileage from death-as-spectacle; we keep it.)
- A persistent **leaderboard sidebar** ranks all living factions by planets + Power. Watching
  yourself climb it — and watching the leader get mobbed — is the scoreboard-as-drama loop.

## 6. UX

One screen. The map is 90% of it; factions are flat bold colors so the political map reads
instantly from across the room.

- **Selecting:** click/tap any planet adjacent to your territory → it highlights with attack
  preview (estimated cost vs. its current defense) → confirm sends at the current slider value.
- **The slider** sits fixed at the bottom (territorial.io's signature control), thumb-reachable
  on a phone.
- **Top bar:** your Power balance (live-ticking), income, interest rate, % of galaxy owned.
- **Right rail:** the leaderboard. Faction colors, planet counts, deaths struck through.
- **Feedback:** lanes pulse with traveling attack fronts; planets flash on flips; a kill-feed
  ticker announces eliminations ("⬛ Void Compact has fallen to 🟥 Crimson Pact").
- New game flow: difficulty pick → play. Autosave continuously to localStorage; Continue on the
  title screen resumes mid-battle.

## 7. Technical architecture

Designed as the *opposite* of v1's stack:

| | v1 (legacy) | v2 |
|---|---|---|
| Topology | Client + Socket.IO server + DB, 2 hosts | **Single static web app. No server. No DB. No sockets.** |
| Simulation | 1s ticks, ORM writes per entity per tick | **In-memory fixed-timestep sim (10 ticks/s), pure TS** |
| Opponents | Required humans, real-time | 10–15 in-process bots |
| Testing | Effectively none | Deterministic + seeded RNG → unit-test and replay everything |

Concretely:

- **One package.** Vite + React + TypeScript. The monorepo, `server-deploy/`, and `netlify/`
  trees from v1 are not carried forward.
- **`src/engine/`** — pure TypeScript, zero React/DOM imports: `step(state, dt, commands) →
  state` at a fixed 10 ticks/s. Map generation, income/interest, fronts, captures, and the bot
  evaluator all live here, each with vitest tests. Bots emit the same `commands` a player does.
- **`src/ui/`** — React + Zustand; `requestAnimationFrame` interpolates between sim ticks.
  Map renders as **Canvas** (one `<canvas>`, redraw on change — 90 nodes × 15 factions × pulsing
  fronts is past SVG's comfort zone, and our hit-testing is just nearest-planet math).
- **Performance budget:** sim tick < 2ms for 90 planets / 16 factions / 50 live fronts. This is
  comfortably achievable with plain arrays and no allocations in the hot path.
- **Persistence:** localStorage. **Deploy:** GitHub Pages or Netlify static.
- **Multiplayer path (explicitly deferred):** deterministic lockstep means real multiplayer is
  "relay everyone's commands" — a dumb message pipe, no authoritative game server. We do not
  build any of it until the solo game is fun.

## 8. Milestones

**M0 — Walking skeleton.** Generated map, income + interest, slider, attack fronts, neutral +
enemy capture, 6 identical greedy bots, elimination, win/lose. *Exit test: you can lose a game
because you over-extended, and know it was your fault.*

**M1 — Make it a game.** Planet specials, defender's multiplier tuning, all four bot
personalities + dogpile/gang-up behaviors, leaderboard, kill feed, attack preview, death-
spectator mode, difficulty levels. *Exit test: someone who isn't us plays three games in a row,
and at least once says "the orange one betrayed me."*

**M2 — Juice & variety.** Map seeds with named layouts, wormholes, faction names/emblems,
sound, end-game replay timeline of the political map, balance pass from playtests. *Stretch:
hotseat-on-one-map experiments; lockstep online prototype.*

## 9. Non-goals (so v1's scope creep stays dead)

- No servers, accounts, databases, or WebSockets — online multiplayer waits until M2 is done.
- No build menus, tech trees, ship classes, unit micromanagement, or formal diplomacy/alliances
  (alliance *behavior* emerges from bot weights; there is no treaty UI).
- No fog of war — the political map being fully visible is the spectacle.
- No 3D, no WebGL engine work.

## 10. Open questions (to settle by playing, not debating)

1. **Interest curve** — territorial.io's exact rates, or gentler? This number single-handedly
   sets the expand/bank tension and will need the most tuning.
2. **Defender's multiplier** (1.5×?) and whether defense drain can bankrupt a defender fighting
   on two fronts — the multi-front collapse is dramatic but may be too punishing.
3. **Attack travel time** — instant pressure (pure territorial.io) vs. visible travel along the
   lane (2–3s, more readable and more space-y). Leaning travel; needs feel-testing. Either way,
   travel is cosmetic only — in-flight fronts can never be intercepted or recalled (see 5.2).
4. **Map size vs. bot count** — 60 planets/10 bots plays tight and fast; 90/16 plays epic.
5. **65% domination threshold** — high enough to feel earned, low enough to skip the mop-up?
6. **Vulture rule** — does a dead faction's land revert to neutral (race to grab) or transfer
   to the killer (rewards the kill shot)? Revert-to-neutral is more chaotic and probably more fun.
