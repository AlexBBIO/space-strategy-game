/**
 * Deterministic PRNG (mulberry32). The engine advances state.rngState in
 * place so a run with the same seed and command stream is bit-identical —
 * this is what makes replays, tests, and future lockstep multiplayer work.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextRand(state: { rngState: number }): number {
  const a = (state.rngState + 0x6d2b79f5) | 0;
  state.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
