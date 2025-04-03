import { Fleet, Game, Planet, PhaseLane, Player } from '../database/entities';
import { AppDataSource } from '../database/connection';
import { GAME_CONSTANTS, GameState, Position } from '@space-strategy-game/shared';
import { GameRepository } from './repositories/GameRepository';
import { PlanetRepository } from './repositories/PlanetRepository';
import { FleetRepository } from './repositories/FleetRepository';
import { PlayerRepository } from './repositories/PlayerRepository';
import { logger } from '../utils/logger';

export class GameEngine {
  private gameRepository: GameRepository;
  private planetRepository: PlanetRepository;
  private fleetRepository: FleetRepository;
  private playerRepository: PlayerRepository;
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.gameRepository = new GameRepository(AppDataSource);
    this.planetRepository = new PlanetRepository(AppDataSource);
    this.fleetRepository = new FleetRepository(AppDataSource);
    this.playerRepository = new PlayerRepository(AppDataSource);
  }

  async startGame(gameId: string): Promise<boolean> {
    try {
      // Get the game
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        logger.error(`Game with ID ${gameId} not found`);
        return false;
      }

      // Update game status
      game.status = 'in_progress';
      game.lastTickTimestamp = Date.now();
      await this.gameRepository.save(game);

      // Initialize galaxy
      await this.initializeGalaxy(game);

      // Start game loop
      this.startGameLoop(gameId);

      logger.info(`Game ${gameId} started successfully`);
      return true;
    } catch (error) {
      logger.error(`Error starting game ${gameId}:`, error);
      return false;
    }
  }

  private async initializeGalaxy(game: Game): Promise<void> {
    try {
      const playerCount = game.playerIds.length;
      const planetCount = Math.max(10, playerCount * 3); // At least 3 planets per player
      
      // Create planets
      const planets: Planet[] = [];
      const mapSize = 1000; // Size of the map
      
      for (let i = 0; i < planetCount; i++) {
        const planet = new Planet();
        planet.id = `planet-${i}-${game.id}`;
        planet.name = `Planet ${i + 1}`;
        planet.x = Math.random() * mapSize;
        planet.y = Math.random() * mapSize;
        planet.owner = null;
        planet.ownerId = null;
        planet.population = Math.floor(Math.random() * 50) + 50; // 50-100 population
        planet.maxPopulation = GAME_CONSTANTS.DEFAULT_MAX_POPULATION;
        planet.populationGrowthRate = GAME_CONSTANTS.POPULATION_GROWTH_RATE;
        planet.hasShipyard = Math.random() > 0.7; // 30% chance of having a shipyard
        planet.game = game;
        planet.gameId = game.id;
        
        planets.push(planet);
      }
      
      // Assign starting planets to players
      const playerIds = game.playerIds;
      for (let i = 0; i < playerIds.length; i++) {
        const player = await this.playerRepository.findById(playerIds[i]);
        if (!player) continue;
        
        const startingPlanet = planets[i];
        startingPlanet.owner = player;
        startingPlanet.ownerId = player.id;
        startingPlanet.hasShipyard = true; // Starting planets always have shipyards
        
        // Create initial fleet for the player
        const fleet = new Fleet();
        fleet.id = `fleet-${i}-${game.id}`;
        fleet.owner = player;
        fleet.ownerId = player.id;
        fleet.x = startingPlanet.x;
        fleet.y = startingPlanet.y;
        fleet.strength = GAME_CONSTANTS.DEFAULT_FLEET_STRENGTH;
        fleet.originPlanet = startingPlanet;
        fleet.originPlanetId = startingPlanet.id;
        fleet.destinationPlanet = null;
        fleet.destinationPlanetId = null;
        fleet.travelProgress = 0;
        fleet.moving = false;
        fleet.game = game;
        fleet.gameId = game.id;
        
        await this.fleetRepository.save(fleet);
      }
      
      // Save planets
      for (const planet of planets) {
        await this.planetRepository.save(planet);
      }
      
      // Create phase lanes
      this.createPhaseLanes(game, planets);
      
      logger.info(`Galaxy initialized for game ${game.id}`);
    } catch (error) {
      logger.error(`Error initializing galaxy for game ${game.id}:`, error);
      throw error;
    }
  }

  private async createPhaseLanes(game: Game, planets: Planet[]): Promise<void> {
    try {
      // Create phase lanes between planets
      // We'll use a simple algorithm to connect each planet to its closest neighbors
      const phaseLanes: PhaseLane[] = [];
      
      for (let i = 0; i < planets.length; i++) {
        const planet = planets[i];
        
        // Create 2-3 connections for each planet
        const connections = Math.floor(Math.random() * 2) + 2; // 2-3 connections
        
        // Find the closest planets
        const distances: { planetIndex: number; distance: number }[] = [];
        
        for (let j = 0; j < planets.length; j++) {
          if (i === j) continue; // Skip self
          
          const otherPlanet = planets[j];
          const distance = this.calculateDistance(
            { x: planet.x, y: planet.y },
            { x: otherPlanet.x, y: otherPlanet.y }
          );
          
          distances.push({ planetIndex: j, distance });
        }
        
        // Sort by distance
        distances.sort((a, b) => a.distance - b.distance);
        
        // Create connections to the closest planets
        for (let k = 0; k < Math.min(connections, distances.length); k++) {
          const { planetIndex, distance } = distances[k];
          const otherPlanet = planets[planetIndex];
          
          // Check if this connection already exists
          const existingLane = phaseLanes.find(
            lane => (lane.planetId1 === planet.id && lane.planetId2 === otherPlanet.id) ||
                   (lane.planetId1 === otherPlanet.id && lane.planetId2 === planet.id)
          );
          
          if (!existingLane) {
            const phaseLane = new PhaseLane();
            phaseLane.id = `lane-${planet.id}-${otherPlanet.id}`;
            phaseLane.planetId1 = planet.id;
            phaseLane.planetId2 = otherPlanet.id;
            phaseLane.planet1 = planet;
            phaseLane.planet2 = otherPlanet;
            phaseLane.distance = distance;
            phaseLane.game = game;
            phaseLane.gameId = game.id;
            
            phaseLanes.push(phaseLane);
            await AppDataSource.getRepository(PhaseLane).save(phaseLane);
          }
        }
      }
      
      logger.info(`Created ${phaseLanes.length} phase lanes for game ${game.id}`);
    } catch (error) {
      logger.error(`Error creating phase lanes for game ${game.id}:`, error);
      throw error;
    }
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private startGameLoop(gameId: string): void {
    const tickRate = GAME_CONSTANTS.TICK_RATE_MS;
    const gameLoop = async () => {
      try {
        await this.processTick(gameId);
        
        // Schedule next tick
        const timer = setTimeout(gameLoop, tickRate);
        this.gameTimers.set(gameId, timer);
      } catch (error) {
        logger.error(`Error in game loop for game ${gameId}:`, error);
        this.stopGame(gameId);
      }
    };
    
    // Start the loop
    gameLoop();
  }

  private async processTick(gameId: string): Promise<void> {
    try {
      // Get game and related data
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        logger.error(`Game with ID ${gameId} not found during tick processing`);
        this.stopGame(gameId);
        return;
      }
      
      // Update last tick timestamp
      const now = Date.now();
      const timeDelta = now - game.lastTickTimestamp;
      game.lastTickTimestamp = now;
      
      // Process planet population growth
      await this.processPlanetGrowth(game);
      
      // Process fleet movement
      await this.processFleetMovement(game);
      
      // Process combat
      await this.processCombat(game);
      
      // Check game end conditions
      await this.checkGameEndConditions(game);
      
      // Save game state
      await this.gameRepository.save(game);
      
      logger.debug(`Processed tick for game ${gameId}`);
    } catch (error) {
      logger.error(`Error processing tick for game ${gameId}:`, error);
      throw error;
    }
  }

  private async processPlanetGrowth(game: Game): Promise<void> {
    try {
      const planets = await this.planetRepository.findByGameId(game.id);
      
      for (const planet of planets) {
        if (planet.ownerId) {
          // Only owned planets grow population
          const growthAmount = planet.population * planet.populationGrowthRate;
          planet.population = Math.min(planet.population + growthAmount, planet.maxPopulation);
          await this.planetRepository.save(planet);
        }
      }
    } catch (error) {
      logger.error(`Error processing planet growth for game ${game.id}:`, error);
      throw error;
    }
  }

  private async processFleetMovement(game: Game): Promise<void> {
    try {
      const fleets = await this.fleetRepository.findByGameId(game.id);
      const phaseLanes = await AppDataSource.getRepository(PhaseLane).find({
        where: { gameId: game.id }
      });
      
      for (const fleet of fleets) {
        if (fleet.moving && fleet.destinationPlanetId) {
          const destinationPlanet = await this.planetRepository.findById(fleet.destinationPlanetId);
          if (!destinationPlanet) continue;
          
          // Find the phase lane for this movement
          const phaseLane = phaseLanes.find(
            lane => (lane.planetId1 === fleet.originPlanetId && lane.planetId2 === fleet.destinationPlanetId) ||
                   (lane.planetId1 === fleet.destinationPlanetId && lane.planetId2 === fleet.originPlanetId)
          );
          
          if (!phaseLane) continue;
          
          // Update travel progress
          fleet.travelProgress += GAME_CONSTANTS.FLEET_SPEED;
          
          // Update position based on progress
          if (fleet.originPlanetId) {
            const originPlanet = await this.planetRepository.findById(fleet.originPlanetId);
            if (originPlanet) {
              // Interpolate position
              fleet.x = originPlanet.x + (destinationPlanet.x - originPlanet.x) * fleet.travelProgress;
              fleet.y = originPlanet.y + (destinationPlanet.y - originPlanet.y) * fleet.travelProgress;
            }
          }
          
          // Check if fleet has arrived
          if (fleet.travelProgress >= 1) {
            fleet.x = destinationPlanet.x;
            fleet.y = destinationPlanet.y;
            fleet.travelProgress = 0;
            fleet.moving = false;
            fleet.originPlanetId = fleet.destinationPlanetId;
            fleet.originPlanet = destinationPlanet;
            fleet.destinationPlanetId = null;
            fleet.destinationPlanet = null;
          }
          
          await this.fleetRepository.save(fleet);
        }
      }
    } catch (error) {
      logger.error(`Error processing fleet movement for game ${game.id}:`, error);
      throw error;
    }
  }

  private async processCombat(game: Game): Promise<void> {
    try {
      const planets = await this.planetRepository.findByGameId(game.id);
      
      for (const planet of planets) {
        // Get all fleets at this planet
        const fleets = await this.fleetRepository.findByPosition(planet.x, planet.y, game.id);
        
        if (fleets.length <= 1) continue; // No combat with just one fleet
        
        // Group fleets by owner
        const fleetsByOwner = new Map<string, Fleet[]>();
        for (const fleet of fleets) {
          if (!fleetsByOwner.has(fleet.ownerId)) {
            fleetsByOwner.set(fleet.ownerId, []);
          }
          fleetsByOwner.get(fleet.ownerId)?.push(fleet);
        }
        
        // If there's only one owner, no combat
        if (fleetsByOwner.size <= 1) continue;
        
        // Process combat between fleets
        await this.processFleetCombat(fleetsByOwner);
        
        // Process planet bombardment if there are enemy fleets
        if (planet.ownerId) {
          await this.processPlanetBombardment(planet, fleets);
        }
      }
    } catch (error) {
      logger.error(`Error processing combat for game ${game.id}:`, error);
      throw error;
    }
  }

  private async processFleetCombat(fleetsByOwner: Map<string, Fleet[]>): Promise<void> {
    try {
      // Calculate total strength for each owner
      const strengthByOwner = new Map<string, number>();
      
      for (const [ownerId, fleets] of fleetsByOwner.entries()) {
        const totalStrength = fleets.reduce((sum, fleet) => sum + fleet.strength, 0);
        strengthByOwner.set(ownerId, totalStrength);
      }
      
      // Each owner's fleets attack other owners' fleets
      for (const [attackerId, attackerFleets] of fleetsByOwner.entries()) {
        const attackerStrength = strengthByOwner.get(attackerId) || 0;
        
        for (const [defenderId, defenderFleets] of fleetsByOwner.entries()) {
          if (attackerId === defenderId) continue;
          
          const defenderStrength = strengthByOwner.get(defenderId) || 0;
          
          // Calculate damage
          const attackPower = attackerStrength * GAME_CONSTANTS.COMBAT_POWER_RATIO;
          const defensePower = defenderStrength * GAME_CONSTANTS.COMBAT_POWER_RATIO;
          
          // Apply damage proportionally to all fleets
          const damageToDefender = Math.min(attackPower, defenderStrength);
          const damageRatio = damageToDefender / defenderStrength;
          
          for (const fleet of defenderFleets) {
            const fleetDamage = fleet.strength * damageRatio;
            fleet.strength -= fleetDamage;
            
            // Remove fleet if strength is zero or negative
            if (fleet.strength <= 0) {
              await this.fleetRepository.remove(fleet);
            } else {
              await this.fleetRepository.save(fleet);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing fleet combat:', error);
      throw error;
    }
  }

  private async processPlanetBombardment(planet: Planet, fleets: Fleet[]): Promise<void> {
    try {
      // Group fleets by owner
      const fleetsByOwner = new Map<string, Fleet[]>();
      
      for (const fleet of fleets) {
        if (!fleetsByOwner.has(fleet.ownerId)) {
          fleetsByOwner.set(fleet.ownerId, []);
        }
        fleetsByOwner.get(fleet.ownerId)?.push(fleet);
      }
      
      // Calculate total strength for enemy fleets
      let enemyStrength = 0;
      let friendlyStrength = 0;
      
      for (const [ownerId, ownerFleets] of fleetsByOwner.entries()) {
        const ownerStrength = ownerFleets.reduce((sum, fleet) => sum + fleet.strength, 0);
        
        if (ownerId === planet.ownerId) {
          friendlyStrength = ownerStrength;
        } else {
          enemyStrength += ownerStrength;
        }
      }
      
      // If enemy strength is greater than friendly strength, bombard the planet
      if (enemyStrength > friendlyStrength) {
        const bombardmentPower = (enemyStrength - friendlyStrength) * GAME_CONSTANTS.COMBAT_POWER_RATIO;
        planet.population = Math.max(0, planet.population - bombardmentPower);
        
        // If population reaches zero, planet is captured by the strongest enemy fleet
        if (planet.population <= 0) {
          let strongestEnemyId = '';
          let strongestEnemyStrength = 0;
          
          for (const [ownerId, ownerFleets] of fleetsByOwner.entries()) {
            if (ownerId !== planet.ownerId) {
              const ownerStrength = ownerFleets.reduce((sum, fleet) => sum + fleet.strength, 0);
              
              if (ownerStrength > strongestEnemyStrength) {
                strongestEnemyStrength = ownerStrength;
                strongestEnemyId = ownerId;
              }
            }
          }
          
          if (strongestEnemyId) {
            const newOwner = await this.playerRepository.findById(strongestEnemyId);
            if (newOwner) {
              planet.owner = newOwner;
              planet.ownerId = newOwner.id;
              planet.population = 10; // Initial population after capture
            }
          }
        }
        
        await this.planetRepository.save(planet);
      }
    } catch (error) {
      logger.error(`Error processing planet bombardment for planet ${planet.id}:`, error);
      throw error;
    }
  }

  private async checkGameEndConditions(game: Game): Promise<void> {
    try {
      // Get all planets grouped by owner
      const planets = await this.planetRepository.findByGameId(game.id);
      const planetsByOwner = new Map<string | null, Planet[]>();
      
      for (const planet of planets) {
        const ownerId = planet.ownerId || null;
        
        if (!planetsByOwner.has(ownerId)) {
          planetsByOwner.set(ownerId, []);
        }
        
        planetsByOwner.get(ownerId)?.push(planet);
      }
      
      // Remove null owner (neutral planets)
      planetsByOwner.delete(null);
      
      // Check if there's only one player left
      if (planetsByOwner.size === 1) {
        const winnerId = [...planetsByOwner.keys()][0];
        
        if (winnerId) {
          game.status = 'finished';
          await this.gameRepository.save(game);
          
          // Stop the game loop
          this.stopGame(game.id);
          
          logger.info(`Game ${game.id} finished. Winner: ${winnerId}`);
        }
      }
      
      // Or if all players have been eliminated (no planets owned)
      if (planetsByOwner.size === 0) {
        game.status = 'finished';
        await this.gameRepository.save(game);
        
        // Stop the game loop
        this.stopGame(game.id);
        
        logger.info(`Game ${game.id} finished. No winner (all players eliminated)`);
      }
    } catch (error) {
      logger.error(`Error checking game end conditions for game ${game.id}:`, error);
      throw error;
    }
  }

  async stopGame(gameId: string): Promise<void> {
    try {
      // Clear the game timer
      const timer = this.gameTimers.get(gameId);
      if (timer) {
        clearTimeout(timer);
        this.gameTimers.delete(gameId);
      }
      
      // Update game status
      const game = await this.gameRepository.findById(gameId);
      if (game && game.status !== 'finished') {
        game.status = 'finished';
        await this.gameRepository.save(game);
      }
      
      logger.info(`Game ${gameId} stopped`);
    } catch (error) {
      logger.error(`Error stopping game ${gameId}:`, error);
    }
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    try {
      const game = await this.gameRepository.findById(gameId);
      if (!game) return null;
      
      const players = await this.playerRepository.findByIds(game.playerIds);
      const planets = await this.planetRepository.findByGameId(gameId);
      const phaseLines = await AppDataSource.getRepository(PhaseLane).find({
        where: { gameId }
      });
      const fleets = await this.fleetRepository.findByGameId(gameId);
      
      // Convert to shared types
      return {
        id: game.id,
        players: players.map(player => ({
          id: player.id,
          name: player.name,
          color: player.color
        })),
        planets: planets.map(planet => ({
          id: planet.id,
          name: planet.name,
          position: { x: planet.x, y: planet.y },
          ownerId: planet.ownerId,
          owner: planet.owner ? {
            id: planet.owner.id,
            name: planet.owner.name,
            color: planet.owner.color
          } : null,
          population: planet.population,
          maxPopulation: planet.maxPopulation,
          populationGrowthRate: planet.populationGrowthRate,
          hasShipyard: planet.hasShipyard
        })),
        phaseLines: phaseLines.map(lane => ({
          id: lane.id,
          planetId1: lane.planetId1,
          planetId2: lane.planetId2,
          distance: lane.distance
        })),
        fleets: fleets.map(fleet => ({
          id: fleet.id,
          ownerId: fleet.ownerId,
          owner: {
            id: fleet.owner.id,
            name: fleet.owner.name,
            color: fleet.owner.color
          },
          position: { x: fleet.x, y: fleet.y },
          strength: fleet.strength,
          originPlanetId: fleet.originPlanetId,
          destinationPlanetId: fleet.destinationPlanetId,
          travelProgress: fleet.travelProgress,
          moving: fleet.moving
        })),
        timestamp: game.lastTickTimestamp
      };
    } catch (error) {
      logger.error(`Error getting game state for game ${gameId}:`, error);
      return null;
    }
  }

  async moveFleet(fleetId: string, destinationPlanetId: string): Promise<boolean> {
    try {
      const fleet = await this.fleetRepository.findById(fleetId);
      if (!fleet) {
        logger.error(`Fleet with ID ${fleetId} not found`);
        return false;
      }
      
      const destinationPlanet = await this.planetRepository.findById(destinationPlanetId);
      if (!destinationPlanet) {
        logger.error(`Destination planet with ID ${destinationPlanetId} not found`);
        return false;
      }
      
      // Check if planets are connected by a phase lane
      const phaseLane = await AppDataSource.getRepository(PhaseLane).findOne({
        where: [
          { planetId1: fleet.originPlanetId, planetId2: destinationPlanetId, gameId: fleet.gameId },
          { planetId1: destinationPlanetId, planetId2: fleet.originPlanetId, gameId: fleet.gameId }
        ]
      });
      
      if (!phaseLane) {
        logger.error(`No phase lane between planets ${fleet.originPlanetId} and ${destinationPlanetId}`);
        return false;
      }
      
      // Update fleet
      fleet.destinationPlanetId = destinationPlanetId;
      fleet.destinationPlanet = destinationPlanet;
      fleet.moving = true;
      fleet.travelProgress = 0;
      
      await this.fleetRepository.save(fleet);
      
      logger.info(`Fleet ${fleetId} moving to planet ${destinationPlanetId}`);
      return true;
    } catch (error) {
      logger.error(`Error moving fleet ${fleetId} to planet ${destinationPlanetId}:`, error);
      return false;
    }
  }

  async splitFleet(fleetId: string, percentage: number): Promise<string | null> {
    try {
      if (percentage <= 0 || percentage >= 100) {
        logger.error(`Invalid split percentage: ${percentage}`);
        return null;
      }
      
      const fleet = await this.fleetRepository.findById(fleetId);
      if (!fleet) {
        logger.error(`Fleet with ID ${fleetId} not found`);
        return null;
      }
      
      // Calculate new fleet strength
      const newFleetStrength = fleet.strength * (percentage / 100);
      fleet.strength -= newFleetStrength;
      
      // Create new fleet
      const newFleet = new Fleet();
      newFleet.id = `fleet-${Date.now()}-${fleet.gameId}`;
      newFleet.owner = fleet.owner;
      newFleet.ownerId = fleet.ownerId;
      newFleet.x = fleet.x;
      newFleet.y = fleet.y;
      newFleet.strength = newFleetStrength;
      newFleet.originPlanet = fleet.originPlanet;
      newFleet.originPlanetId = fleet.originPlanetId;
      newFleet.destinationPlanet = null;
      newFleet.destinationPlanetId = null;
      newFleet.travelProgress = 0;
      newFleet.moving = false;
      newFleet.game = fleet.game;
      newFleet.gameId = fleet.gameId;
      
      // Save both fleets
      await this.fleetRepository.save(fleet);
      await this.fleetRepository.save(newFleet);
      
      logger.info(`Fleet ${fleetId} split, created new fleet ${newFleet.id}`);
      return newFleet.id;
    } catch (error) {
      logger.error(`Error splitting fleet ${fleetId}:`, error);
      return null;
    }
  }
}
