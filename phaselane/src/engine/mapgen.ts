import * as C from './constants';
import { mulberry32 } from './rng';
import { Faction, GameState, PlanetState } from './types';

export const PLAYER_COLOR = '#4da6ff';

const BOT_NAMES = [
  'Crimson Pact', 'Void Compact', 'Auric Dominion', 'Verdant Swarm',
  'Umbra Syndicate', 'Solar Hegemony', 'Iron Concord', 'Quantum Tide',
  'Pale Armada', 'Drift Cartel', 'Cinder League', 'Outer Veil',
  'Hollow Choir', 'Gilded Reach', 'Last Meridian',
];
const BOT_COLORS = [
  '#e74c3c', '#f39c12', '#9b59b6', '#2ecc71', '#e67e22', '#1abc9c',
  '#f1c40f', '#fd79a8', '#a29bfe', '#d63031', '#00b894', '#6c5ce7',
  '#fab1a0', '#81ecec', '#ffeaa7',
];

export interface GameOptions {
  planetCount?: number;
  botCount?: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createGame(seed: number, opts: GameOptions = {}): GameState {
  const rng = mulberry32(seed);
  const planetCount = opts.planetCount ?? C.DEFAULT_PLANETS;
  const botCount = Math.min(opts.botCount ?? C.DEFAULT_BOTS, BOT_NAMES.length);

  // Scatter planets with a minimum spacing, relaxing if the map gets tight.
  const margin = 60;
  const planets: PlanetState[] = [];
  let minDist = 95;
  while (planets.length < planetCount) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const pos = {
        x: margin + rng() * (C.MAP_W - margin * 2),
        y: margin + rng() * (C.MAP_H - margin * 2),
      };
      if (planets.every(p => dist(p.pos, pos) >= minDist)) {
        const r = rng();
        const size = (r < 0.5 ? 1 : r < 0.85 ? 2 : 3) as 1 | 2 | 3;
        const shieldMax = 20 + size * 10 + Math.floor(rng() * 10);
        planets.push({
          id: planets.length,
          pos,
          size,
          neighbors: [],
          owner: -1,
          shield: shieldMax,
          shieldMax,
          guard: 0,
          priority: 1,
        });
        placed = true;
      }
    }
    if (!placed) minDist *= 0.9;
  }

  // Lanes: each planet links to its 3 nearest, then bridge any disconnected
  // components with the globally shortest cross-component lane.
  const edges = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  for (const p of planets) {
    const nearest = planets
      .filter(q => q.id !== p.id)
      .sort((a, b) => dist(p.pos, a.pos) - dist(p.pos, b.pos))
      .slice(0, 3);
    for (const q of nearest) edges.add(key(p.id, q.id));
  }
  const parent = planets.map(p => p.id);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  for (const e of edges) {
    const [a, b] = e.split(':').map(Number);
    union(a, b);
  }
  for (;;) {
    const roots = new Set(planets.map(p => find(p.id)));
    if (roots.size <= 1) break;
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const p of planets) {
      for (const q of planets) {
        if (find(p.id) === find(q.id)) continue;
        const d = dist(p.pos, q.pos);
        if (d < bestD) { bestD = d; best = [p.id, q.id]; }
      }
    }
    if (!best) break;
    edges.add(key(best[0], best[1]));
    union(best[0], best[1]);
  }
  for (const e of edges) {
    const [a, b] = e.split(':').map(Number);
    planets[a].neighbors.push(b);
    planets[b].neighbors.push(a);
  }

  // Spawns: greedy farthest-point so factions start spread out.
  const factionCount = botCount + 1;
  const spawns: number[] = [Math.floor(rng() * planets.length)];
  while (spawns.length < factionCount) {
    let best = -1;
    let bestD = -1;
    for (const p of planets) {
      if (spawns.includes(p.id)) continue;
      const d = Math.min(...spawns.map(s => dist(p.pos, planets[s].pos)));
      if (d > bestD) { bestD = d; best = p.id; }
    }
    spawns.push(best);
  }

  const factions: Faction[] = [];
  for (let i = 0; i < factionCount; i++) {
    factions.push({
      id: i,
      name: i === 0 ? 'You' : BOT_NAMES[i - 1],
      color: i === 0 ? PLAYER_COLOR : BOT_COLORS[i - 1],
      isPlayer: i === 0,
      balance: C.START_BALANCE,
      alive: true,
      nextThinkAt: 1 + i * 0.2,
    });
    const home = planets[spawns[i]];
    home.owner = i;
    if (home.size < 2) home.size = 2;
    home.shield = 12;
    home.guard = C.START_BALANCE;
  }

  return {
    seed,
    rngState: Math.floor(rng() * 2 ** 31),
    tick: 0,
    time: 0,
    planets,
    factions,
    fronts: [],
    nextFrontId: 1,
    winner: null,
    events: [],
  };
}
