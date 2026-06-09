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

export function factionInterest(state: GameState, fid: number): number {
  const f = state.factions[fid];
  return Math.min(
    C.INTEREST_RATE * f.balance,
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

/** Advance the sim one fixed tick. Mutates state; deterministic per seed. */
export function step(state: GameState, playerCommands: Command[] = []): void {
  if (state.winner !== null) return;
  state.tick++;
  state.time += C.DT;

  const commands = playerCommands.concat(botCommands(state));
  for (const cmd of commands) applyAttack(state, cmd);

  for (const f of state.factions) {
    if (!f.alive) continue;
    f.balance += (factionIncome(state, f.id) + factionInterest(state, f.id)) * C.DT;
  }

  for (const front of state.fronts.slice()) grind(state, front);

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
  const from = p.neighbors.find(n => state.planets[n].owner === cmd.faction);
  if (from === undefined) return;

  const fraction = Math.min(1, Math.max(0.05, cmd.fraction));
  const commit = f.balance * fraction;
  if (commit < C.MIN_COMMIT) return;
  f.balance -= commit;

  // Attacking a planet you already have a front on reinforces it.
  const existing = state.fronts.find(fr => fr.faction === cmd.faction && fr.target === cmd.target);
  if (existing) {
    existing.power += commit;
  } else {
    state.fronts.push({ id: state.nextFrontId++, faction: cmd.faction, from, target: cmd.target, power: commit });
  }
}

/**
 * Combat is damage-over-time, never instant. Each tick the front deals
 * damage proportional to its remaining power and pays for it at the
 * exchange rate (defender's advantage on owned planets). The defender's
 * balance absorbs damage before the shield does — so planets only start
 * falling once their owner is being bled dry, which is the territorial.io
 * "break their bank, then take land fast" arc. Overkill resolves fast;
 * close fights grind.
 */
function grind(state: GameState, front: Front): void {
  const attacker = state.factions[front.faction];
  if (!attacker.alive) {
    removeFront(state, front);
    return;
  }
  const p = state.planets[front.target];
  if (p.owner === front.faction) {
    // Captured by another of our fronts mid-flight; stand down.
    attacker.balance += front.power;
    removeFront(state, front);
    return;
  }

  const owner = p.owner >= 0 ? state.factions[p.owner] : null;
  const exchange = owner ? C.EXCHANGE_OWNED : C.EXCHANGE_NEUTRAL;

  const defLoss = C.GRIND_RATE * front.power * C.DT;
  front.power -= defLoss * exchange;

  if (owner && owner.alive) {
    // Part of the damage besieges the planet directly; the rest is absorbed
    // by the owner's war chest (overflowing to the shield once they're broke).
    let toBalance = defLoss * (1 - C.SIEGE_SHIELD_FRAC);
    const absorbed = Math.min(owner.balance, toBalance);
    owner.balance -= absorbed;
    toBalance -= absorbed;
    p.shield -= defLoss * C.SIEGE_SHIELD_FRAC + toBalance;
  } else {
    p.shield -= defLoss;
  }

  if (front.power <= C.FRONT_FIZZLE) {
    removeFront(state, front);
    p.shield = Math.max(p.shield, 1);
    return;
  }
  if (p.shield <= 0) {
    p.owner = front.faction;
    p.shield = Math.max(5, p.shieldMax * C.CAPTURE_SHIELD_FRAC);
    attacker.balance += front.power; // survivors return to the bank
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
