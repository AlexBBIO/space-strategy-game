import { describe, expect, it } from 'vitest';
import { createGame } from './mapgen';
import { factionIncome, isAttackable, planetCount, step } from './step';

describe('mapgen', () => {
  it('generates a fully connected galaxy', () => {
    const state = createGame(42);
    const visited = new Set<number>([0]);
    const queue = [0];
    while (queue.length) {
      const id = queue.pop()!;
      for (const n of state.planets[id].neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    expect(visited.size).toBe(state.planets.length);
  });

  it('gives every faction exactly one starting planet', () => {
    const state = createGame(7);
    for (const f of state.factions) expect(planetCount(state, f.id)).toBe(1);
  });
});

describe('determinism', () => {
  it('produces identical runs from the same seed', () => {
    const a = createGame(123);
    const b = createGame(123);
    for (let i = 0; i < 3000; i++) {
      step(a);
      step(b);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('economy', () => {
  it('grows balance with income plus capped interest', () => {
    const state = createGame(5);
    const before = state.factions[0].balance;
    for (let i = 0; i < 100; i++) step(state); // 10s
    const f = state.factions[0];
    expect(f.balance).toBeGreaterThan(before);
    expect(factionIncome(state, 0)).toBeGreaterThan(0);
  });
});

describe('combat', () => {
  it('captures a neutral planet with overwhelming force, non-instantly', () => {
    const state = createGame(9);
    const target = state.planets.find(
      p => p.owner === -1 && isAttackable(state, 0, p.id),
    )!;
    state.factions[0].balance = 500;
    step(state, [{ type: 'attack', faction: 0, target: target.id, fraction: 0.5 }]);
    expect(target.owner).toBe(-1); // not instant
    let ticks = 0;
    while (target.owner === -1 && ticks < 600) {
      step(state);
      ticks++;
    }
    expect(target.owner).toBe(0);
    expect(ticks).toBeGreaterThan(2); // the grind takes real time
  });

  it('repels an underpowered attack and keeps the planet', () => {
    const state = createGame(11);
    for (const f of state.factions) f.nextThinkAt = Infinity; // freeze bots
    const target = state.planets.find(
      p => p.owner === -1 && isAttackable(state, 0, p.id),
    )!;
    state.factions[0].balance = 12; // commits ~6 against a 22+ shield
    step(state, [{ type: 'attack', faction: 0, target: target.id, fraction: 0.5 }]);
    for (let i = 0; i < 600; i++) step(state);
    expect(target.owner).toBe(-1);
    expect(state.fronts.length).toBe(0);
  });
});

describe('full game', () => {
  it('bots play to a conclusion', () => {
    const state = createGame(2026);
    state.factions[0].isPlayer = false; // all-bot battle royale
    let ticks = 0;
    while (state.winner === null && ticks < 150000) {
      step(state);
      ticks++;
    }
    expect(state.winner).not.toBeNull();
  }, 30000);
});
