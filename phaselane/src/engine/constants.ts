/** Fixed sim timestep in seconds (10 ticks/s). */
export const DT = 0.1;

export const MAP_W = 1600;
export const MAP_H = 1000;
export const DEFAULT_PLANETS = 56;
export const DEFAULT_BOTS = 7;

export const START_BALANCE = 60;
/** Bots stop pricing targets and go to war above this war chest. */
export const BOT_AGGRO_BALANCE = 300;
/** Income per second by planet size (index 1–3). */
export const INCOME_BY_SIZE = [0, 1.0, 1.4, 1.9];
/** Interest per second on banked balance... */
export const INTEREST_RATE = 0.008;
/** ...capped at this multiple of income (anti-turtle). */
export const INTEREST_CAP_INCOME_MULT = 1.5;

/** Combat damage rate per second — the master pacing knob. */
export const GRIND_RATE = 0.25;
/** Power an attacker pays per point of damage dealt (defender's advantage). */
export const EXCHANGE_OWNED = 1.3;
export const EXCHANGE_NEUTRAL = 0.9;
/**
 * How fast garrisons equalize toward the empire mean, per second. This sets
 * the alpha-strike window: overwhelm a planet faster than reinforcements
 * flow in, or settle in to bleed the whole empire through one front.
 * (Capturing a planet also triggers an instant even redeploy.)
 */
export const REBALANCE_RATE = 0.3;
/** Shield regen per second when not under attack. */
export const SHIELD_REGEN = 2.0;
/** Shield a planet flips with, as a fraction of its max. */
export const CAPTURE_SHIELD_FRAC = 0.3;
export const MIN_COMMIT = 5;
/** Fronts below this power dissipate (decay is exponential, so without a
 * floor a beaten front would linger forever, pinning the shield). */
export const FRONT_FIZZLE = 1;

export const WIN_PLANET_FRAC = 0.65;
/** Sudden death: at the time limit the largest empire wins. Guarantees an
 * ending even if the last titans deadlock. */
export const TIME_LIMIT = 1200;
export const EVENT_LOG_MAX = 6;
