import { z } from 'zod';

// Basic schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

export const PlanetSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: PositionSchema,
  ownerId: z.string().nullable(),
  owner: PlayerSchema.nullable(),
  population: z.number(),
  maxPopulation: z.number(),
  populationGrowthRate: z.number(),
  hasShipyard: z.boolean(),
});

export const PhaseLaneSchema = z.object({
  id: z.string(),
  planetId1: z.string(),
  planetId2: z.string(),
  distance: z.number(),
});

export const FleetSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  owner: PlayerSchema,
  position: PositionSchema,
  strength: z.number(),
  originPlanetId: z.string().nullable(),
  destinationPlanetId: z.string().nullable(),
  travelProgress: z.number(),
  moving: z.boolean(),
});

export const GameStateSchema = z.object({
  id: z.string(),
  players: z.array(PlayerSchema),
  planets: z.array(PlanetSchema),
  phaseLines: z.array(PhaseLaneSchema),
  fleets: z.array(FleetSchema),
  timestamp: z.number(),
});

export const GameLobbySchema = z.object({
  id: z.string(),
  name: z.string(),
  host: PlayerSchema,
  players: z.array(PlayerSchema),
  maxPlayers: z.number(),
  status: z.enum(['waiting', 'starting', 'in_progress', 'finished']),
  createdAt: z.number(),
});

// Command schemas
export const MoveFleetCommandSchema = z.object({
  type: z.literal('MOVE_FLEET'),
  fleetId: z.string(),
  destinationPlanetId: z.string(),
});

export const SplitFleetCommandSchema = z.object({
  type: z.literal('SPLIT_FLEET'),
  fleetId: z.string(),
  percentage: z.number().min(0).max(100),
});

export const JoinGameCommandSchema = z.object({
  type: z.literal('JOIN_GAME'),
  gameId: z.string(),
  playerName: z.string(),
});

export const CreateGameCommandSchema = z.object({
  type: z.literal('CREATE_GAME'),
  gameName: z.string(),
  playerName: z.string(),
  maxPlayers: z.number().min(2).max(8),
});

export const StartGameCommandSchema = z.object({
  type: z.literal('START_GAME'),
  gameId: z.string(),
});

export const GameCommandSchema = z.discriminatedUnion('type', [
  MoveFleetCommandSchema,
  SplitFleetCommandSchema,
  JoinGameCommandSchema,
  CreateGameCommandSchema,
  StartGameCommandSchema,
]);

export const CommandResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});
