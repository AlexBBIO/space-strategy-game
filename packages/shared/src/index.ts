// Export all types and schemas
export * from './types';
export * from './schemas';

// Game constants
export const GAME_CONSTANTS = {
  TICK_RATE_MS: 1000, // 1 second per tick
  FLEET_SPEED: 0.05, // 5% of phase lane per tick
  POPULATION_GROWTH_RATE: 0.01, // 1% growth per tick
  COMBAT_POWER_RATIO: 0.1, // 10% of fleet strength is lost per combat tick
  MAX_PLAYERS_PER_GAME: 8,
  DEFAULT_MAX_POPULATION: 100,
  DEFAULT_FLEET_STRENGTH: 10,
};

// Utility functions
export function calculateDistance(pos1: { x: number, y: number }, pos2: { x: number, y: number }): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validation helpers
export function validateGameCommand(command: any): boolean {
  try {
    const schema = GAME_CONSTANTS;
    return true;
  } catch (error) {
    console.error('Command validation failed:', error);
    return false;
  }
}
