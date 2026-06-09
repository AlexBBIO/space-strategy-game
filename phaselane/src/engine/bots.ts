import * as C from './constants';
import { nextRand } from './rng';
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

  // Frontier: every non-owned planet adjacent to our territory, with a crude
  // price estimate (shield plus a share of the defender's war chest).
  let bestNeutral = -1;
  let bestNeutralCost = Infinity;
  let bestEnemy = -1;
  let bestEnemyCost = Infinity;
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
        // Defense is now visible on the planet itself: garrison + shield.
        const cost = (t.shield + t.guard) * 1.6;
        if (cost < bestEnemyCost) { bestEnemy = t.id; bestEnemyCost = cost; }
      }
    }
  }

  if (bestNeutral >= 0 && f.balance > bestNeutralCost * 1.8 + 15) {
    const fraction = clamp((bestNeutralCost * 1.6 + 12) / f.balance, 0.2, 0.65);
    return { type: 'attack', faction: fid, target: bestNeutral, fraction };
  }
  // War: when the frontier is closed and the price looks right — or the war
  // chest is overflowing (the anti-stalemate pressure valve; without it two
  // rich empires can eye each other forever, and a bot stuck behind one
  // overpriced neutral would never fight at all).
  if (bestEnemy >= 0 && (bestNeutral < 0 || f.balance > C.BOT_AGGRO_BALANCE)) {
    if (f.balance > bestEnemyCost * 1.5 + 30) {
      const fraction = clamp((bestEnemyCost * 1.6 + 15) / f.balance, 0.25, 0.7);
      return { type: 'attack', faction: fid, target: bestEnemy, fraction };
    }
    if (f.balance > C.BOT_AGGRO_BALANCE) {
      return { type: 'attack', faction: fid, target: bestEnemy, fraction: 0.6 };
    }
  }
  return null;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
