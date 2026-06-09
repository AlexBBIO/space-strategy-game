import * as C from './constants';
import { botCommands } from './bots';
import { Command, Front, GameState } from './types';

export function factionIncome(state: GameState, fid: number): number {
  let income = 0;
  for (const p of state.planets) {
    if (p.owner === fid) income += C.INCOME_BY_SIZE[p.size];
  }
  return income;
}

export function totalPower(state: GameState, fid: number): number {
  let total = 0;
  for (const p of state.planets) {
    if (p.owner === fid) total += p.guard;
  }
  return total;
}

export function factionInterest(state: GameState, fid: number): number {
  return Math.min(
    C.INTEREST_RATE * totalPower(state, fid),
    C.INTEREST_CAP_INCOME_MULT * factionIncome(state, fid),
  );
}

export function planetCount(state: GameState, fid: number): number {
  let n = 0;
  for (const p of state.planets) if (p.owner === fid) n++;
  return n;
}

export function isAttackable(state: GameState, fid: number, target: number): boolean {
  const p = state.planets[target];
  if (!p || p.owner === fid) return false;
  return p.neighbors.some(n => state.planets[n].owner === fid);
}

/** Rough price of taking a planet — same heuristic the bots use to shop.
 * The 1.25 covers reinforcements equalizing in during the fight. */
export function estimateAttackCost(state: GameState, fid: number, target: number): number {
  const p = state.planets[target];
  if (!p || p.owner === fid) return 0;
  if (p.owner < 0) return p.shield * C.EXCHANGE_NEUTRAL;
  return (p.shield + p.guard) * C.EXCHANGE_OWNED * 1.25;
}

/** Advance the sim one fixed tick. Mutates state; deterministic per seed. */
export function step(state: GameState, playerCommands: Command[] = []): void {
  if (state.winner !== null) return;
  state.tick++;
  state.time += C.DT;

  const commands = playerCommands.concat(botCommands(state));
  for (const cmd of commands) applyAttack(state, cmd);

  // Economy: income lands on each planet, interest spreads evenly, then
  // garrisons equalize toward the empire mean (conserving the total) — this
  // flow is how reinforcements reach a besieged planet.
  for (const f of state.factions) {
    if (!f.alive) continue;
    const owned = state.planets.filter(p => p.owner === f.id);
    if (!owned.length) continue;
    for (const p of owned) p.guard += C.INCOME_BY_SIZE[p.size] * C.DT;
    const interest = factionInterest(state, f.id) * C.DT;
    for (const p of owned) p.guard += interest / owned.length;
    const mean = owned.reduce((s, p) => s + p.guard, 0) / owned.length;
    for (const p of owned) p.guard += (mean - p.guard) * C.REBALANCE_RATE * C.DT;
  }

  for (const front of state.fronts.slice()) grind(state, front);

  // Refresh the cached totals the UI and bots read.
  for (const f of state.factions) {
    if (f.alive) f.balance = totalPower(state, f.id);
  }

  const contested = new Set<number>();
  for (const fr of state.fronts) contested.add(fr.target);
  for (const p of state.planets) {
    if (!contested.has(p.id) && p.shield < p.shieldMax) {
      p.shield = Math.min(p.shieldMax, p.shield + C.SHIELD_REGEN * C.DT);
    }
  }

  checkEliminations(state);
  checkWinner(state);
}

function applyAttack(state: GameState, cmd: Command): void {
  const f = state.factions[cmd.faction];
  if (!f || !f.alive) return;
  const p = state.planets[cmd.target];
  if (!p || p.owner === cmd.faction) return;

  // Launch from the requested planet when valid, else the nearest owned
  // neighbor of the target.
  let from: number | undefined;
  if (
    cmd.from !== undefined &&
    state.planets[cmd.from]?.owner === cmd.faction &&
    p.neighbors.includes(cmd.from)
  ) {
    from = cmd.from;
  } else {
    let bestD = Infinity;
    for (const n of p.neighbors) {
      const q = state.planets[n];
      if (q.owner !== cmd.faction) continue;
      const d = Math.hypot(q.pos.x - p.pos.x, q.pos.y - p.pos.y);
      if (d < bestD) {
        bestD = d;
        from = n;
      }
    }
  }
  if (from === undefined) return;

  const fraction = Math.min(1, Math.max(0.05, cmd.fraction));
  const total = totalPower(state, cmd.faction);
  const commit = total * fraction;
  if (commit < C.MIN_COMMIT) return;
  // The commitment musters proportionally from every garrison — attacking
  // thins your defense everywhere, which is the risk being priced in.
  for (const q of state.planets) {
    if (q.owner === cmd.faction) q.guard -= commit * (q.guard / total);
  }
  f.balance = total - commit;

  // Attacking a planet you already have a front on reinforces it; an
  // explicit launch planet also re-routes the lane the front is shown on.
  const existing = state.fronts.find(fr => fr.faction === cmd.faction && fr.target === cmd.target);
  if (existing) {
    existing.power += commit;
    if (cmd.from !== undefined && from === cmd.from) existing.from = from;
  } else {
    state.fronts.push({ id: state.nextFrontId++, faction: cmd.faction, from, target: cmd.target, power: commit });
  }
}

/**
 * Combat is damage-over-time, never instant, and entirely local: the front
 * grinds the target's garrison, then its shield. Help arrives only through
 * the garrison-equalization flow — overwhelm a planet before reinforcements
 * trickle in, or settle in and bleed the empire through this one wound.
 * The attacker pays the exchange rate per point of damage dealt.
 */
function grind(state: GameState, front: Front): void {
  const attacker = state.factions[front.faction];
  if (!attacker.alive) {
    removeFront(state, front);
    return;
  }
  const p = state.planets[front.target];
  if (p.owner === front.faction) {
    // Captured by another of our fronts mid-flight; the force garrisons.
    p.guard += front.power;
    removeFront(state, front);
    return;
  }

  const exchange = p.owner >= 0 ? C.EXCHANGE_OWNED : C.EXCHANGE_NEUTRAL;

  let defLoss = C.GRIND_RATE * front.power * C.DT;
  front.power -= defLoss * exchange;

  const guardHit = Math.min(p.guard, defLoss);
  p.guard -= guardHit;
  defLoss -= guardHit;
  p.shield -= defLoss;

  if (front.power <= C.FRONT_FIZZLE) {
    removeFront(state, front);
    p.shield = Math.max(p.shield, 1);
    return;
  }
  if (p.shield <= 0) {
    p.owner = front.faction;
    p.shield = Math.max(5, p.shieldMax * C.CAPTURE_SHIELD_FRAC);
    p.guard = front.power; // the survivors garrison their conquest
    removeFront(state, front);
  }
}

function removeFront(state: GameState, front: Front): void {
  const i = state.fronts.indexOf(front);
  if (i >= 0) state.fronts.splice(i, 1);
}

function checkEliminations(state: GameState): void {
  const counts = new Array(state.factions.length).fill(0);
  for (const p of state.planets) if (p.owner >= 0) counts[p.owner]++;
  for (const f of state.factions) {
    if (f.alive && counts[f.id] === 0) {
      f.alive = false;
      f.balance = 0;
      for (const fr of state.fronts.slice()) {
        if (fr.faction === f.id) removeFront(state, fr);
      }
      pushEvent(state, `${f.name} ${f.isPlayer ? 'have' : 'has'} fallen`, f.color);
    }
  }
}

function checkWinner(state: GameState): void {
  const alive = state.factions.filter(f => f.alive);
  if (alive.length === 1) {
    state.winner = alive[0].id;
  } else {
    for (const f of alive) {
      if (planetCount(state, f.id) >= C.WIN_PLANET_FRAC * state.planets.length) {
        state.winner = f.id;
        break;
      }
    }
  }
  if (state.winner === null && state.time >= C.TIME_LIMIT) {
    let best = alive[0];
    for (const f of alive) {
      const d = planetCount(state, f.id) - planetCount(state, best.id);
      if (d > 0 || (d === 0 && f.balance > best.balance)) best = f;
    }
    state.winner = best.id;
  }
  if (state.winner !== null) {
    const w = state.factions[state.winner];
    pushEvent(state, `${w.name} ${w.isPlayer ? 'rule' : 'rules'} the galaxy`, w.color);
  }
}

export function pushEvent(state: GameState, text: string, color: string): void {
  state.events.unshift({ time: state.time, text, color });
  if (state.events.length > C.EVENT_LOG_MAX) state.events.length = C.EVENT_LOG_MAX;
}
