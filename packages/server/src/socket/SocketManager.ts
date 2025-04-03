import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { 
  GameCommand, 
  GameCommandSchema, 
  CommandResponse, 
  GameState, 
  GameLobby
} from '@space-strategy-game/shared';
import { GameEngine } from '../game/GameEngine';
import { logger } from '../utils/logger';
import { AppDataSource } from '../database/connection';
import { Game, Player } from '../database/entities';
import { PlayerRepository, GameRepository } from '../game/repositories';
import { v4 as uuidv4 } from 'uuid';

export class SocketManager {
  private io: SocketServer;
  private gameEngine: GameEngine;
  private playerRepository: PlayerRepository;
  private gameRepository: GameRepository;
  private playerSockets: Map<string, Set<string>> = new Map(); // playerId -> Set of socketIds
  private socketPlayers: Map<string, string> = new Map(); // socketId -> playerId

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.gameEngine = new GameEngine();
    this.playerRepository = new PlayerRepository(AppDataSource);
    this.gameRepository = new GameRepository(AppDataSource);
    
    this.setupSocketHandlers();
    
    logger.info('Socket.io server initialized');
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Handle player identification
      socket.on('identify', async (data: { playerId?: string, playerName: string }) => {
        try {
          let player: Player | null = null;
          
          // Find or create player
          if (data.playerId) {
            player = await this.playerRepository.findById(data.playerId);
          }
          
          if (!player) {
            // Generate a random color for the player
            const color = this.generateRandomColor();
            player = await this.playerRepository.createPlayer(data.playerName, color);
            logger.info(`New player created: ${player.id} (${player.name})`);
          }
          
          // Associate socket with player
          this.associateSocketWithPlayer(socket.id, player.id);
          
          // Send player data back to client
          socket.emit('identity', {
            success: true,
            player: {
              id: player.id,
              name: player.name,
              color: player.color
            }
          });
          
          logger.info(`Player identified: ${player.id} (${player.name})`);
        } catch (error) {
          logger.error('Error identifying player:', error);
          socket.emit('identity', {
            success: false,
            message: 'Failed to identify player'
          });
        }
      });
      
      // Handle game commands
      socket.on('command', async (data: GameCommand) => {
        try {
          // Validate the command
          const validationResult = GameCommandSchema.safeParse(data);
          if (!validationResult.success) {
            const response: CommandResponse = {
              success: false,
              message: 'Invalid command format'
            };
            socket.emit('commandResponse', response);
            return;
          }
          
          // Get player ID from socket
          const playerId = this.socketPlayers.get(socket.id);
          if (!playerId) {
            const response: CommandResponse = {
              success: false,
              message: 'Player not identified'
            };
            socket.emit('commandResponse', response);
            return;
          }
          
          // Process command based on type
          const command = data;
          let response: CommandResponse;
          
          switch (command.type) {
            case 'CREATE_GAME':
              response = await this.handleCreateGame(playerId, command.gameName, command.maxPlayers);
              break;
            
            case 'JOIN_GAME':
              response = await this.handleJoinGame(playerId, command.gameId);
              break;
            
            case 'START_GAME':
              response = await this.handleStartGame(playerId, command.gameId);
              break;
            
            case 'MOVE_FLEET':
              response = await this.handleMoveFleet(playerId, command.fleetId, command.destinationPlanetId);
              break;
            
            case 'SPLIT_FLEET':
              response = await this.handleSplitFleet(playerId, command.fleetId, command.percentage);
              break;
            
            default:
              response = {
                success: false,
                message: 'Unknown command type'
              };
              break;
          }
          
          socket.emit('commandResponse', response);
        } catch (error) {
          logger.error('Error processing command:', error);
          const response: CommandResponse = {
            success: false,
            message: 'Internal server error'
          };
          socket.emit('commandResponse', response);
        }
      });
      
      // Handle game state requests
      socket.on('getGameState', async (gameId: string) => {
        try {
          const gameState = await this.gameEngine.getGameState(gameId);
          if (gameState) {
            socket.emit('gameState', gameState);
          } else {
            socket.emit('error', { message: 'Game not found' });
          }
        } catch (error) {
          logger.error(`Error getting game state for game ${gameId}:`, error);
          socket.emit('error', { message: 'Failed to get game state' });
        }
      });
      
      // Handle game list requests
      socket.on('getGameList', async () => {
        try {
          const lobbies = await this.getGameLobbies();
          socket.emit('gameList', lobbies);
        } catch (error) {
          logger.error('Error getting game list:', error);
          socket.emit('error', { message: 'Failed to get game list' });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket.id);
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private associateSocketWithPlayer(socketId: string, playerId: string): void {
    // Add socket to player's set of sockets
    if (!this.playerSockets.has(playerId)) {
      this.playerSockets.set(playerId, new Set());
    }
    this.playerSockets.get(playerId)?.add(socketId);
    
    // Map socket to player
    this.socketPlayers.set(socketId, playerId);
  }

  private handleDisconnect(socketId: string): void {
    // Get player ID associated with this socket
    const playerId = this.socketPlayers.get(socketId);
    if (playerId) {
      // Remove this socket from player's set of sockets
      const playerSocketSet = this.playerSockets.get(playerId);
      if (playerSocketSet) {
        playerSocketSet.delete(socketId);
        if (playerSocketSet.size === 0) {
          this.playerSockets.delete(playerId);
        }
      }
      
      // Remove socket to player mapping
      this.socketPlayers.delete(socketId);
    }
  }

  private generateRandomColor(): string {
    // Generate a random color in hex format
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  private async handleCreateGame(
    playerId: string, 
    gameName: string, 
    maxPlayers: number
  ): Promise<CommandResponse> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        return { success: false, message: 'Player not found' };
      }
      
      // Create new game
      const game = new Game();
      game.id = uuidv4();
      game.name = gameName;
      game.host = player;
      game.hostId = player.id;
      game.maxPlayers = Math.min(Math.max(maxPlayers, 2), 8); // Between 2 and 8 players
      game.status = 'waiting';
      game.lastTickTimestamp = Date.now();
      game.playerIds = [player.id];
      
      await this.gameRepository.save(game);
      
      // Convert to lobby object
      const lobby: GameLobby = {
        id: game.id,
        name: game.name,
        host: {
          id: player.id,
          name: player.name,
          color: player.color
        },
        players: [{
          id: player.id,
          name: player.name,
          color: player.color
        }],
        maxPlayers: game.maxPlayers,
        status: game.status,
        createdAt: game.createdAt.getTime()
      };
      
      // Broadcast updated game list
      this.broadcastGameList();
      
      return { 
        success: true, 
        message: 'Game created successfully', 
        data: lobby 
      };
    } catch (error) {
      logger.error('Error creating game:', error);
      return { success: false, message: 'Failed to create game' };
    }
  }

  private async handleJoinGame(
    playerId: string, 
    gameId: string
  ): Promise<CommandResponse> {
    try {
      const player = await this.playerRepository.findById(playerId);
      if (!player) {
        return { success: false, message: 'Player not found' };
      }
      
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        return { success: false, message: 'Game not found' };
      }
      
      // Check if game is joinable
      if (game.status !== 'waiting') {
        return { success: false, message: 'Game is not in waiting state' };
      }
      
      // Check if player is already in the game
      if (game.playerIds.includes(playerId)) {
        return { success: false, message: 'Player is already in the game' };
      }
      
      // Check if game is full
      if (game.playerIds.length >= game.maxPlayers) {
        return { success: false, message: 'Game is full' };
      }
      
      // Add player to the game
      game.playerIds.push(playerId);
      await this.gameRepository.save(game);
      
      // Get all players in the game
      const players = await this.playerRepository.findByIds(game.playerIds);
      
      // Convert to lobby object
      const lobby: GameLobby = {
        id: game.id,
        name: game.name,
        host: {
          id: game.host.id,
          name: game.host.name,
          color: game.host.color
        },
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color
        })),
        maxPlayers: game.maxPlayers,
        status: game.status,
        createdAt: game.createdAt.getTime()
      };
      
      // Notify all players in the game
      this.notifyGamePlayers(game.id, 'gameLobbyUpdate', lobby);
      
      // Broadcast updated game list
      this.broadcastGameList();
      
      return { 
        success: true, 
        message: 'Joined game successfully', 
        data: lobby 
      };
    } catch (error) {
      logger.error('Error joining game:', error);
      return { success: false, message: 'Failed to join game' };
    }
  }

  private async handleStartGame(
    playerId: string, 
    gameId: string
  ): Promise<CommandResponse> {
    try {
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        return { success: false, message: 'Game not found' };
      }
      
      // Check if player is the host
      if (game.hostId !== playerId) {
        return { success: false, message: 'Only the host can start the game' };
      }
      
      // Check if game can be started
      if (game.status !== 'waiting') {
        return { success: false, message: 'Game is not in waiting state' };
      }
      
      // Check if there are enough players
      if (game.playerIds.length < 2) {
        return { success: false, message: 'At least 2 players are required to start the game' };
      }
      
      // Start the game
      game.status = 'starting';
      await this.gameRepository.save(game);
      
      // Initialize game
      const success = await this.gameEngine.startGame(gameId);
      if (!success) {
        game.status = 'waiting';
        await this.gameRepository.save(game);
        return { success: false, message: 'Failed to start game' };
      }
      
      // Get initial game state
      const gameState = await this.gameEngine.getGameState(gameId);
      
      // Notify all players in the game
      this.notifyGamePlayers(game.id, 'gameStarted', gameState);
      
      // Broadcast updated game list
      this.broadcastGameList();
      
      return { 
        success: true, 
        message: 'Game started successfully', 
        data: gameState 
      };
    } catch (error) {
      logger.error('Error starting game:', error);
      return { success: false, message: 'Failed to start game' };
    }
  }

  private async handleMoveFleet(
    playerId: string, 
    fleetId: string, 
    destinationPlanetId: string
  ): Promise<CommandResponse> {
    try {
      // Get the fleet
      const fleet = await AppDataSource.getRepository(Game)
        .createQueryBuilder('fleet')
        .where('fleet.id = :id', { id: fleetId })
        .getOne();
      
      if (!fleet) {
        return { success: false, message: 'Fleet not found' };
      }
      
      // Check if player owns the fleet
      if (fleet.hostId !== playerId) {
        return { success: false, message: 'Player does not own this fleet' };
      }
      
      // Move the fleet
      const success = await this.gameEngine.moveFleet(fleetId, destinationPlanetId);
      if (!success) {
        return { success: false, message: 'Failed to move fleet' };
      }
      
      // Get updated game state
      const gameState = await this.gameEngine.getGameState(fleet.id);
      
      // Notify all players in the game
      if (gameState) {
        this.notifyGamePlayers(fleet.id, 'gameStateUpdate', gameState);
      }
      
      return { 
        success: true, 
        message: 'Fleet moved successfully' 
      };
    } catch (error) {
      logger.error('Error moving fleet:', error);
      return { success: false, message: 'Failed to move fleet' };
    }
  }

  private async handleSplitFleet(
    playerId: string, 
    fleetId: string, 
    percentage: number
  ): Promise<CommandResponse> {
    try {
      // Get the fleet
      const fleet = await AppDataSource.getRepository(Game)
        .createQueryBuilder('fleet')
        .where('fleet.id = :id', { id: fleetId })
        .getOne();
      
      if (!fleet) {
        return { success: false, message: 'Fleet not found' };
      }
      
      // Check if player owns the fleet
      if (fleet.hostId !== playerId) {
        return { success: false, message: 'Player does not own this fleet' };
      }
      
      // Split the fleet
      const newFleetId = await this.gameEngine.splitFleet(fleetId, percentage);
      if (!newFleetId) {
        return { success: false, message: 'Failed to split fleet' };
      }
      
      // Get updated game state
      const gameState = await this.gameEngine.getGameState(fleet.id);
      
      // Notify all players in the game
      if (gameState) {
        this.notifyGamePlayers(fleet.id, 'gameStateUpdate', gameState);
      }
      
      return { 
        success: true, 
        message: 'Fleet split successfully',
        data: { newFleetId }
      };
    } catch (error) {
      logger.error('Error splitting fleet:', error);
      return { success: false, message: 'Failed to split fleet' };
    }
  }

  private async getGameLobbies(): Promise<GameLobby[]> {
    try {
      // Get all games in waiting state
      const games = await this.gameRepository.findByStatus('waiting');
      
      // Convert to lobby objects
      const lobbies: GameLobby[] = [];
      
      for (const game of games) {
        const players = await this.playerRepository.findByIds(game.playerIds);
        
        lobbies.push({
          id: game.id,
          name: game.name,
          host: {
            id: game.host.id,
            name: game.host.name,
            color: game.host.color
          },
          players: players.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color
          })),
          maxPlayers: game.maxPlayers,
          status: game.status,
          createdAt: game.createdAt.getTime()
        });
      }
      
      return lobbies;
    } catch (error) {
      logger.error('Error getting game lobbies:', error);
      return [];
    }
  }

  private async broadcastGameList(): Promise<void> {
    try {
      const lobbies = await this.getGameLobbies();
      this.io.emit('gameList', lobbies);
    } catch (error) {
      logger.error('Error broadcasting game list:', error);
    }
  }

  private notifyGamePlayers(gameId: string, event: string, data: any): void {
    try {
      // Get the game
      this.gameRepository.findById(gameId).then(game => {
        if (!game) return;
        
        // Get all socket IDs for players in the game
        const socketIds: string[] = [];
        
        for (const playerId of game.playerIds) {
          const playerSockets = this.playerSockets.get(playerId);
          if (playerSockets) {
            socketIds.push(...playerSockets);
          }
        }
        
        // Send event to all sockets
        for (const socketId of socketIds) {
          this.io.to(socketId).emit(event, data);
        }
      });
    } catch (error) {
      logger.error(`Error notifying game players for game ${gameId}:`, error);
    }
  }

  // Method to broadcast game state updates
  public broadcastGameState(gameId: string, gameState: GameState): void {
    this.notifyGamePlayers(gameId, 'gameStateUpdate', gameState);
  }
}
