import { useEffect, useRef, useState } from 'react';
import {
  Command, DT, GameState, INCOME_BY_SIZE, createGame, estimateAttackCost,
  factionIncome, factionInterest, isAttackable, planetCount, step,
} from '../engine';
import { computeView, draw, findPlanetAt } from './render';

interface FactionRow {
  id: number;
  name: string;
  color: string;
  planets: number;
  power: number;
  alive: boolean;
  isPlayer: boolean;
}

interface Inspect {
  id: number;
  ownerName: string;
  ownerColor: string;
  isYours: boolean;
  size: number;
  income: number;
  guard: number;
  shield: number;
  priority: number;
  estCost: number | null;
  underAttack: boolean;
}

interface Hud {
  time: number;
  balance: number;
  income: number;
  interest: number;
  planets: number;
  totalPlanets: number;
  rows: FactionRow[];
  events: { time: number; text: string; color: string }[];
  winner: number | null;
  playerAlive: boolean;
  inspect: Inspect | null;
}

function inspectInfo(state: GameState, id: number | null): Inspect | null {
  if (id === null) return null;
  const p = state.planets[id];
  if (!p) return null;
  return {
    id,
    ownerName: p.owner >= 0 ? state.factions[p.owner].name : 'Neutral',
    ownerColor: p.owner >= 0 ? state.factions[p.owner].color : '#8a93a6',
    isYours: p.owner === 0,
    size: p.size,
    income: INCOME_BY_SIZE[p.size],
    guard: Math.max(0, Math.ceil(p.guard)),
    shield: Math.max(0, Math.ceil(p.shield)),
    priority: p.priority,
    estCost: isAttackable(state, 0, id) ? Math.ceil(estimateAttackCost(state, 0, id)) : null,
    underAttack: state.fronts.some(fr => fr.target === id),
  };
}

function snapshot(state: GameState, inspectId: number | null): Hud {
  const rows = state.factions
    .map(f => ({
      id: f.id,
      name: f.name,
      color: f.color,
      planets: planetCount(state, f.id),
      power: Math.round(f.balance),
      alive: f.alive,
      isPlayer: f.isPlayer,
    }))
    .sort((a, b) => b.planets - a.planets || b.power - a.power);
  return {
    time: state.time,
    balance: state.factions[0].balance,
    income: factionIncome(state, 0),
    interest: factionInterest(state, 0),
    planets: planetCount(state, 0),
    totalPlanets: state.planets.length,
    rows,
    events: state.events.slice(),
    winner: state.winner,
    playerAlive: state.factions[0].alive,
    inspect: inspectInfo(state, inspectId),
  };
}

export function Game({ seed, onExit }: { seed: number; onExit: () => void }) {
  const stateRef = useRef<GameState | null>(null);
  if (!stateRef.current) stateRef.current = createGame(seed);
  const queueRef = useRef<Command[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef<number | null>(null);
  const selectedRef = useRef<number | null>(null);

  const [fraction, setFraction] = useState(0.35);
  const fractionRef = useRef(fraction);
  fractionRef.current = fraction;
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [hud, setHud] = useState<Hud>(() => snapshot(stateRef.current!, null));

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudAt = 0;
    const loop = (now: number) => {
      const state = stateRef.current!;
      const dtMs = Math.min(100, now - last);
      last = now;
      if (!pausedRef.current) acc += (dtMs / 1000) * speedRef.current;
      while (acc >= DT) {
        step(state, queueRef.current);
        queueRef.current = [];
        acc -= DT;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const view = computeView(w, h);
        const attackable = new Set<number>();
        if (state.factions[0].alive && state.winner === null) {
          for (const p of state.planets) {
            if (isAttackable(state, 0, p.id)) attackable.add(p.id);
          }
        }
        draw(ctx, state, view, w, h, attackable, hoverRef.current, selectedRef.current);
        const hov = hoverRef.current;
        canvas.style.cursor =
          hov !== null && (attackable.has(hov) || state.planets[hov].owner === 0)
            ? hov !== null && attackable.has(hov) ? 'crosshair' : 'pointer'
            : 'default';
      }

      if (now >= hudAt) {
        setHud(snapshot(state, hoverRef.current ?? selectedRef.current));
        hudAt = now + 150;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const canvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current!;
    const canvas = canvasRef.current!;
    const { x, y } = canvasPoint(e);
    const view = computeView(canvas.clientWidth, canvas.clientHeight);
    const id = findPlanetAt(state, view, x, y);
    if (id === null) {
      selectedRef.current = null;
      return;
    }
    if (state.planets[id].owner === 0) {
      selectedRef.current = id;
      return;
    }
    if (state.winner !== null || !state.factions[0].alive) return;
    if (!isAttackable(state, 0, id)) return;
    queueRef.current.push({
      type: 'attack',
      faction: 0,
      target: id,
      fraction: fractionRef.current,
      from: selectedRef.current ?? undefined,
    });
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const { x, y } = canvasPoint(e);
    const view = computeView(canvas.clientWidth, canvas.clientHeight);
    hoverRef.current = findPlanetAt(stateRef.current!, view, x, y);
  };

  const winnerRow = hud.winner !== null ? hud.rows.find(r => r.id === hud.winner) : null;

  return (
    <div className="game">
      <canvas
        ref={canvasRef}
        className="map"
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={() => (hoverRef.current = null)}
      />

      <div className="topbar">
        <span className="stat power">⚡ {Math.floor(hud.balance)}</span>
        <span className="stat">+{(hud.income + hud.interest).toFixed(1)}/s</span>
        <span className="stat dim">
          ({hud.income.toFixed(1)} income, {hud.interest.toFixed(1)} interest)
        </span>
        <span className="stat">
          🪐 {hud.planets}/{hud.totalPlanets}
        </span>
        <span className="spacer" />
        <button onClick={() => setPaused(p => !p)}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        {[1, 2, 4].map(s => (
          <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
        <button onClick={onExit}>Quit</button>
      </div>

      <div className="leaderboard">
        {hud.rows.map(r => (
          <div key={r.id} className={`row ${r.alive ? '' : 'dead'} ${r.isPlayer ? 'me' : ''}`}>
            <span className="swatch" style={{ background: r.color }} />
            <span className="name">{r.name}</span>
            <span className="planets">{r.planets}</span>
            <span className="power">⚡{r.power}</span>
          </div>
        ))}
      </div>

      {hud.inspect && (
        <div className="inspector">
          <div className="head">
            <span className="swatch" style={{ background: hud.inspect.ownerColor }} />
            <span style={{ color: hud.inspect.ownerColor }}>
              {hud.inspect.isYours ? 'Your planet' : `${hud.inspect.ownerName} planet`}
            </span>
          </div>
          <div className="line">
            Size {hud.inspect.size} · income +{hud.inspect.income.toFixed(1)}/s ·{' '}
            {hud.inspect.isYours
              ? `garrison ${hud.inspect.guard} ⚡ · shield ${hud.inspect.shield}`
              : `defense ${hud.inspect.guard + hud.inspect.shield} (garrison ${hud.inspect.guard} + shield ${hud.inspect.shield})`}
          </div>
          {hud.inspect.estCost !== null && (
            <div className="line cost">Attack cost ≈ {hud.inspect.estCost} ⚡ — click to attack</div>
          )}
          {hud.inspect.underAttack && <div className="line war">⚔ Under attack</div>}
          {hud.inspect.isYours && (
            <div className="line priority">
              <span>Garrison priority ×{hud.inspect.priority.toFixed(1)}</span>
              <input
                type="range"
                min={50}
                max={300}
                step={25}
                value={Math.round(hud.inspect.priority * 100)}
                onChange={e => {
                  const id = hud.inspect!.id;
                  queueRef.current.push({
                    type: 'priority',
                    faction: 0,
                    planet: id,
                    priority: Number(e.target.value) / 100,
                  });
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="events">
        {hud.events.map((ev, i) => (
          <div key={`${ev.time}-${i}`} style={{ color: ev.color }}>
            {ev.text}
          </div>
        ))}
      </div>

      <div className="commitbar">
        <span className="label">Commit</span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(fraction * 100)}
          onChange={e => setFraction(Number(e.target.value) / 100)}
        />
        <span className="pct">{Math.round(fraction * 100)}%</span>
        <span className="amount">≈ {Math.floor(hud.balance * fraction)} ⚡</span>
      </div>

      {!hud.playerAlive && hud.winner === null && (
        <div className="banner defeat">
          Your empire has fallen — watch how it ends, or{' '}
          <button onClick={onExit}>start again</button>
        </div>
      )}

      {hud.winner !== null && winnerRow && (
        <div className="overlay">
          <div className="panel">
            <h2 style={{ color: winnerRow.color }}>
              {winnerRow.isPlayer ? 'You rule the galaxy' : `${winnerRow.name} rules the galaxy`}
            </h2>
            <p>
              {Math.floor(hud.time / 60)}m {Math.floor(hud.time % 60)}s ·{' '}
              {winnerRow.planets} planets
            </p>
            <button className="primary" onClick={onExit}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
