// Pacing probe: all-bot games, report milestones.
import { createGame } from '../src/engine/mapgen';
import { step } from '../src/engine/step';

for (const seed of [1, 2, 3, 2026]) {
  const s = createGame(seed);
  s.factions[0].isPlayer = false;
  let neutralsGoneAt = 0, firstKillAt = 0;
  const neutrals0 = s.planets.filter(p => p.owner < 0).length;
  while (s.winner === null && s.tick < 200000) {
    step(s);
    if (!neutralsGoneAt && s.planets.every(p => p.owner >= 0)) neutralsGoneAt = s.time;
    if (!firstKillAt && s.factions.some(f => !f.alive)) firstKillAt = s.time;
  }
  const mins = (t: number) => (t / 60).toFixed(1) + 'm';
  console.log(
    `seed ${seed}: neutrals(${neutrals0}) gone=${neutralsGoneAt ? mins(neutralsGoneAt) : 'never'}, ` +
    `first kill=${firstKillAt ? mins(firstKillAt) : 'never'}, ` +
    `winner=${s.winner !== null ? mins(s.time) : 'NONE by ' + mins(s.time)}`
  );
}
