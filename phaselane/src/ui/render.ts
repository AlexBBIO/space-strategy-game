import { GameState, MAP_H, MAP_W, mulberry32 } from '../engine';

export interface View {
  scale: number;
  ox: number;
  oy: number;
}

export function computeView(w: number, h: number): View {
  const pad = 24;
  const scale = Math.min((w - pad * 2) / MAP_W, (h - pad * 2) / MAP_H);
  return {
    scale,
    ox: (w - MAP_W * scale) / 2,
    oy: (h - MAP_H * scale) / 2,
  };
}

export function planetRadius(size: number): number {
  return 6 + size * 3;
}

export function findPlanetAt(state: GameState, view: View, sx: number, sy: number): number | null {
  for (const p of state.planets) {
    const x = view.ox + p.pos.x * view.scale;
    const y = view.oy + p.pos.y * view.scale;
    if (Math.hypot(sx - x, sy - y) <= planetRadius(p.size) + 7) return p.id;
  }
  return null;
}

const NEUTRAL_COLOR = '#6b7689';

export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: View,
  w: number,
  h: number,
  attackable: Set<number>,
  hover: number | null,
  selected: number | null,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, w, h);

  // Starfield, deterministic per map seed.
  const stars = mulberry32(state.seed ^ 0x5f3759df);
  for (let i = 0; i < 140; i++) {
    const x = stars() * w;
    const y = stars() * h;
    const a = 0.12 + stars() * 0.25;
    ctx.fillStyle = `rgba(200,215,255,${a.toFixed(2)})`;
    ctx.fillRect(x, y, stars() < 0.15 ? 2 : 1, 1);
  }

  const sx = (x: number) => view.ox + x * view.scale;
  const sy = (y: number) => view.oy + y * view.scale;

  // Empire territory: soft color fields around owned planets. Same-color
  // fields overlap and read as one contiguous, shifting border.
  for (const p of state.planets) {
    if (p.owner < 0) continue;
    const x = sx(p.pos.x);
    const y = sy(p.pos.y);
    const r = (70 + p.size * 8) * view.scale;
    const color = state.factions[p.owner].color;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${color}38`);
    g.addColorStop(0.65, `${color}18`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Phase lanes.
  ctx.strokeStyle = 'rgba(120,140,180,0.22)';
  ctx.lineWidth = 1;
  const drawn = new Set<string>();
  for (const p of state.planets) {
    for (const n of p.neighbors) {
      const k = p.id < n ? `${p.id}:${n}` : `${n}:${p.id}`;
      if (drawn.has(k)) continue;
      drawn.add(k);
      const q = state.planets[n];
      ctx.beginPath();
      ctx.moveTo(sx(p.pos.x), sy(p.pos.y));
      ctx.lineTo(sx(q.pos.x), sy(q.pos.y));
      ctx.stroke();
    }
  }

  // Fronts: colored lane, marching dots, power label, pulsing target ring.
  for (const fr of state.fronts) {
    const a = state.planets[fr.from].pos;
    const b = state.planets[fr.target].pos;
    const color = state.factions[fr.faction].color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(a.x), sy(a.y));
    ctx.lineTo(sx(b.x), sy(b.y));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const t = (state.time * 0.45 + i / 3) % 1;
      const x = sx(a.x + (b.x - a.x) * t);
      const y = sy(a.y + (b.y - a.y) * t);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const lx = sx(a.x + (b.x - a.x) * 0.55);
    const ly = sy(a.y + (b.y - a.y) * 0.55);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(String(Math.round(fr.power)), lx, ly - 6);

    const tp = state.planets[fr.target];
    const pulse = 3 + Math.sin(state.time * 6) * 1.5;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx(tp.pos.x), sy(tp.pos.y), planetRadius(tp.size) + pulse + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Planets.
  const contestedSet = new Set<number>();
  for (const fr of state.fronts) contestedSet.add(fr.target);
  for (const p of state.planets) {
    const x = sx(p.pos.x);
    const y = sy(p.pos.y);
    const r = planetRadius(p.size);
    ctx.fillStyle = p.owner >= 0 ? state.factions[p.owner].color : NEUTRAL_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (attackable.has(p.id)) {
      ctx.strokeStyle = hover === p.id ? '#ffffff' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = hover === p.id ? 2 : 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (selected === p.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Income pips: one gold dot per income tier (= planet size).
    ctx.fillStyle = '#ffd76a';
    for (let i = 0; i < p.size; i++) {
      ctx.beginPath();
      ctx.arc(x - (p.size - 1) * 3 + i * 6, y - r - 7, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const contested = contestedSet.has(p.id);
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = contested ? '#ff9a9a' : 'rgba(170,185,210,0.85)';
    ctx.fillText(String(Math.max(0, Math.ceil(p.shield))), x, y + r + 12);
  }
}
