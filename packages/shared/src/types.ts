// Shared types to be imported by both client and server

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface Planet {
  id: string;
  name: string;
  position: Position;
  ownerId: string | null;
  owner: Player | null;
  population: number;
  maxPopulation: number;
  populationGrowthRate: number;
  hasShipyard: boolean;
}

export interface PhaseLane {
  id: string;
  planetId1: string;
  planetId2: string;
  distance: number;
}

export interface Fleet {
  id: string;
  ownerId: string;
  owner: Player;
  position: Position;
  strength: number;
  originPlanetId: string | null;
  destinationPlanetId: string | null;
  travelProgress: number;
  moving: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  id: string;
  players: Player[];
  planets: Planet[];
  phaseLines: PhaseLane[];
  fleets: Fleet[];
  timestamp: number;
}

// For lobby system
export interface GameLobby {
  id: string;
  name: string;
  host: Player;
  players: Player[];
  maxPlayers: number;
  status: "waiting" | "starting" | "in_progress" | "finished";
  createdAt: number;
}

// Command interfaces for client-server communication
export interface MoveFleetCommand {
  type: 'MOVE_FLEET';
  fleetId: string;
  destinationPlanetId: string;
}

export interface SplitFleetCommand {
  type: 'SPLIT_FLEET';
  fleetId: string;
  percentage: number;
}

// Additional interfaces for lobby and authentication
export interface JoinGameCommand {
  type: 'JOIN_GAME';
  gameId: string;
  playerName: string;
}

export interface CreateGameCommand {
  type: 'CREATE_GAME';
  gameName: string;
  playerName: string;
  maxPlayers: number;
}

export interface StartGameCommand {
  type: 'START_GAME';
  gameId: string;
}

export type GameCommand = 
  | MoveFleetCommand 
  | SplitFleetCommand
  | JoinGameCommand
  | CreateGameCommand
  | StartGameCommand;

// Response types
export interface CommandResponse {
  success: boolean;
  message?: string;
  data?: any;
}
