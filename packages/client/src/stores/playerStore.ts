import { create } from 'zustand';
import { Player } from '@space-strategy-game/shared';

interface PlayerState {
  player: Player | null;
  setPlayer: (player: Player) => void;
  clearPlayer: () => void;
}

// Helper to generate a unique ID if needed
const generatePlayerId = () => {
  return `player_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
};

// Initialize by checking localStorage first
const initializePlayerState = () => {
  try {
    const storedPlayer = localStorage.getItem('player');
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      // Ensure the player has an ID
      if (!player.id) {
        player.id = generatePlayerId();
        localStorage.setItem('player', JSON.stringify(player));
      }
      return player;
    }
  } catch (error) {
    console.error('Error loading player data:', error);
  }
  return null;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  player: initializePlayerState(),
  setPlayer: (player) => {
    // Ensure player has an ID
    const playerWithId = {
      ...player,
      id: player.id || generatePlayerId()
    };
    
    // Save player to localStorage
    localStorage.setItem('player', JSON.stringify(playerWithId));
    set({ player: playerWithId });
  },
  clearPlayer: () => {
    localStorage.removeItem('player');
    set({ player: null });
  },
}));
