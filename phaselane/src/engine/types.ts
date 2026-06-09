export interface Vec {
  x: number;
  y: number;
}

export interface PlanetState {
  id: number;
  pos: Vec;
  size: 1 | 2 | 3;
  neighbors: number[];
  /** Faction id, or -1 for neutral. */
  owner: number;
  shield: number;
  shieldMax: number;
  /**
   * The owner's Power stationed here. A faction's total Power is the sum of
   * its garrisons; garrisons continuously equalize toward priority-weighted
   * targets, so defense is auto-distributed — and visible — planet by planet.
   * Always 0 for neutral planets (their defense is the shield).
   */
  guard: number;
  /**
   * Garrison priority (owner-set stance, default 1). The equalization flow
   * targets total × priority/Σpriorities — dial a planet up to fortify it,
   * down to strip it. A stance, not unit orders: no troops to move by hand.
   */
  priority: number;
}

export interface Faction {
  id: number;
  name: string;
  color: string;
  isPlayer: boolean;
  /** Cached total Power (sum of garrisons), refreshed every tick. */
  balance: number;
  alive: boolean;
  /** Sim time at which this bot next evaluates the board. */
  nextThinkAt: number;
}

/**
 * A committed attack grinding against one planet. Irrevocable and
 * non-interceptable by design (see DESIGN.md §5.2) — fronts can only be
 * reinforced, never recalled or redirected.
 */
export interface Front {
  id: number;
  faction: number;
  /** Owned planet the attack launched from (rendering only). */
  from: number;
  target: number;
  power: number;
}

export interface GameEvent {
  time: number;
  text: string;
  color: string;
}

export interface GameState {
  seed: number;
  rngState: number;
  tick: number;
  time: number;
  planets: PlanetState[];
  factions: Faction[];
  fronts: Front[];
  nextFrontId: number;
  winner: number | null;
  events: GameEvent[];
}

export interface AttackCommand {
  type: 'attack';
  faction: number;
  target: number;
  /** Fraction of current balance to commit (0.05–1). */
  fraction: number;
  /** Preferred launch planet; must be an owned neighbor of the target.
   * Cosmetic (Power is empire-wide) but controls which lane the front uses. */
  from?: number;
}

export interface PriorityCommand {
  type: 'priority';
  faction: number;
  planet: number;
  /** Garrison priority, clamped to 0.25–4. */
  priority: number;
}

export type Command = AttackCommand | PriorityCommand;
