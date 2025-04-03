import { create } from 'zustand';
import { Player } from '@space-strategy-game/shared';

interface PlayerState {
  player: Player | null;
  setPlayer: (player: Player) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: null,
  setPlayer: (player) => {
    // Save player to localStorage
    localStorage.setItem('player', JSON.stringify(player));
    set({ player });
  },
  clearPlayer: () => {
    localStorage.removeItem('player');
    set({ player: null });
  },
}));
