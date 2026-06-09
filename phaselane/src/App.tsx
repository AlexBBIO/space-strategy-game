import { useState } from 'react';
import { Game } from './ui/Game';

export function App() {
  const [run, setRun] = useState<{ seed: number; n: number } | null>(null);
  const [seedInput, setSeedInput] = useState('');

  if (run) {
    return <Game key={`${run.seed}-${run.n}`} seed={run.seed} onExit={() => setRun(null)} />;
  }

  const play = () => {
    const seed = seedInput.trim()
      ? Math.abs(hashCode(seedInput.trim()))
      : Math.floor(Math.random() * 2 ** 31);
    setRun({ seed, n: Date.now() });
  };

  return (
    <div className="title">
      <h1>PHASELANE</h1>
      <p className="tagline">
        Grab planets. Bank power. Pick your moment.
        <br />
        One slider against seven rival empires.
      </p>
      <div className="titlerow">
        <input
          placeholder="seed (optional)"
          value={seedInput}
          onChange={e => setSeedInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && play()}
        />
        <button className="primary" onClick={play}>
          Play
        </button>
      </div>
      <p className="hint">
        Click any planet on your border to attack it with the committed share of your Power.
        Attacks can be reinforced, never recalled. Hold 65% of the galaxy — or be the last
        empire standing.
      </p>
    </div>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
