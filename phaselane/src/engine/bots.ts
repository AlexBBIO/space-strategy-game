import * as C from './constants';
import { nextRand } from './rng';
import { factionCapacity } from './step';
import { Command, GameState } from './types';

/**
 * M0 greedy bots: eat the cheapest adjacent neutral while affordable; once
 * the frontier runs dry, hit the cheapest-looking enemy planet when the war
 * chest allows. Personalities and dogpile/gang-up behavior arrive in M1.
 */
export function botCommands(state: GameState): Command[] {
  const out: Command[] = [];
  for (const f of state.factions) {
    if (!f.alive || f.isPlayer) continue;
    if (state.time < f.nextThinkAt) continue;
    f.nextThinkAt = state.time + 1.2 + nextRand(state) * 1.6;
    const cmd = think(state, f.id);
    if (cmd) out.push(cmd);
  }
  return out;
}

function think(state: GameState, fid: number): Command | null {
  const f = state.factions[fid];
  const busy = new Set<number>();
  for (const fr of state.fronts) if (fr.faction === fid) busy.add(fr.target);

  // The crowd turns on a runaway leader: dominant territory, or a war chest
  // towering over the median. Without this, banking quietly wins games.
  const counts = new Array(state.factions.length).fill(0);
  for (const p of state.planets) if (p.owner >= 0) counts[p.owner]++;
  let threat = -1;
  let topPlanets = -1;
  let topPower = -1;
  const powers: number[] = [];
  for (const fac of state.factions) {
    if (!fac.alive) continue;
    powers.push(fac.balance);
    if (topPlanets < 0 || counts[fac.id] > counts[topPlanets]) topPlanets = fac.id;
    if (topPower < 0 || fac.balance > state.factions[topPower].balance) topPower = fac.id;
  }
  powers.sort((a, b) => a - b);
  const median = powers[Math.floor(powers.length / 2)] || 1;
  if (topPlanets !== fid && counts[topPlanets] > C.DOGPILE_PLANET_FRAC * state.planets.length) {
    threat = topPlanets;
  }
  else if (topPower !== fid && state.factions[topPower].balance > 2.5 * Math.max(median, 1)) {
    threat = topPower;
  }

  // Frontier: every non-owned planet adjacent to our territory, with a crude
  // price estimate (shield plus a share of the defender's war chest).
  let bestNeutral = -1;
  let bestNeutralCost = Infinity;
  let bestEnemy = -1;
  let bestEnemyCost = Infinity;
  let bestThreat = -1;
  let bestThreatCost = Infinity;
  const seen = new Set<number>();
  for (const p of state.planets) {
    if (p.owner !== fid) continue;
    for (const n of p.neighbors) {
      const t = state.planets[n];
      if (t.owner === fid || seen.has(t.id) || busy.has(t.id)) continue;
      seen.add(t.id);
      if (t.owner < 0) {
        if (t.shield < bestNeutralCost) { bestNeutral = t.id; bestNeutralCost = t.shield; }
      } else {
        // Defense is visible on the planet itself: garrison + shield.
        const cost = (t.shield + t.guard) * 1.6;
        if (cost < bestEnemyCost) { bestEnemy = t.id; bestEnemyCost = cost; }
        if (t.owner === threat && cost < bestThreatCost) { bestThreat = t.id; bestThreatCost = cost; }
      }
    }
  }

  if (bestNeutral >= 0 && f.balance > bestNeutralCost * 1.8 + 15) {
    const fraction = clamp((bestNeutralCost * 1.6 + 12) / f.balance, 0.2, 0.65);
    return { type: 'attack', faction: fid, target: bestNeutral, fraction };
  }
  // Dogpile the runaway: willing to pay closer to full price, and commit big.
  if (bestThreat >= 0 && f.balance > bestThreatCost * 1.2 + 20) {
    const fraction = clamp((bestThreatCost * 1.4 + 15) / f.balance, 0.3, 0.8);
    return { type: 'attack', faction: fid, target: bestThreat, fraction };
  }
  // War: when the frontier is closed and the price looks right — or the war
  // chest is pressing against the fleet capacity (banked Power near the cap
  // stops growing, so spending it is free; this is also the anti-stalemate
  // valve, and frees a bot stuck behind one overpriced neutral).
  const nearCap = f.balance > C.BOT_AGGRO_CAP_FRAC * factionCapacity(state, fid);
  if (bestEnemy >= 0 && (bestNeutral < 0 || nearCap)) {
    if (f.balance > bestEnemyCost * 1.5 + 30) {
      const fraction = clamp((bestEnemyCost * 1.6 + 15) / f.balance, 0.25, 0.7);
      return { type: 'attack', faction: fid, target: bestEnemy, fraction };
    }
    if (nearCap) {
      return { type: 'attack', faction: fid, target: bestEnemy, fraction: 0.6 };
    }
  }
  return null;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
