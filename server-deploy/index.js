const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nullSafeValue } = require('./fixed-query');
require('dotenv').config();

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash in production environment
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Error logging
const logError = (location, error) => {
  console.error(`ERROR in ${location}:`, error);
  return { error: `${error.message || 'Unknown error'}`, location };
};

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8888',
  'https://space-strategy-game.windsurf.build',
  'https://space-strategy-game-ogfyt.netlify.app'
];

// Set up CORS
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`Origin ${origin} is connecting`);
      // Allow all origins in development
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set up Socket.IO with CORS configuration - allow all origins to fix connection issues
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins to fix connection issues
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // Increase timeout for better connection stability
  pingInterval: 25000
});

// Define port
const PORT = process.env.PORT || 3001;

// Basic API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Space Strategy Game Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Generate a balanced two-player map with strategic layout
function generateTwoPlayerMap(playerIds) {
  const [player1Id, player2Id] = playerIds;
  
  // Define player colors
  const player1Color = '#FF5733'; // Orange-red for player 1
  const player2Color = '#3498DB'; // Blue for player 2
  
  // Create planets array
  const planets = [
    // Player 1 home system
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Alpha Prime',
      position: { x: 200, y: 200 },
      size: 'large',
      population: 100,
      maxPopulation: 150,
      resources: { energy: 50, minerals: 50 },
      resourceOutput: { energy: 10, minerals: 10, research: 5 },
      ownerId: player1Id,
      owner: { id: player1Id, color: player1Color },
      hasShipyard: true,
      defenseLevel: 2,
      specialFeatures: ['capital']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Alpha Minor',
      position: { x: 250, y: 250 },
      size: 'medium',
      population: 60,
      maxPopulation: 100,
      resources: { energy: 30, minerals: 40 },
      resourceOutput: { energy: 7, minerals: 8, research: 2 },
      ownerId: player1Id,
      owner: { id: player1Id, color: player1Color },
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: []
    },
    
    // Player 2 home system
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Omega Prime',
      position: { x: 800, y: 800 },
      size: 'large',
      population: 100,
      maxPopulation: 150,
      resources: { energy: 50, minerals: 50 },
      resourceOutput: { energy: 10, minerals: 10, research: 5 },
      ownerId: player2Id,
      owner: { id: player2Id, color: player2Color },
      hasShipyard: true,
      defenseLevel: 2,
      specialFeatures: ['capital']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Omega Minor',
      position: { x: 750, y: 750 },
      size: 'medium',
      population: 60,
      maxPopulation: 100,
      resources: { energy: 40, minerals: 30 },
      resourceOutput: { energy: 8, minerals: 7, research: 2 },
      ownerId: player2Id,
      owner: { id: player2Id, color: player2Color },
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: []
    },
    
    // Neutral planets in the middle - rich resources but contestable
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Nova Centrum',
      position: { x: 500, y: 500 },
      size: 'large',
      population: 80,
      maxPopulation: 200,
      resources: { energy: 100, minerals: 100 },
      resourceOutput: { energy: 15, minerals: 15, research: 10 },
      ownerId: null,
      owner: null,
      hasShipyard: false,
      defenseLevel: 3,
      specialFeatures: ['resource-rich', 'strategic']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Proxima',
      position: { x: 400, y: 600 },
      size: 'medium',
      population: 40,
      maxPopulation: 120,
      resources: { energy: 70, minerals: 40 },
      resourceOutput: { energy: 12, minerals: 6, research: 3 },
      ownerId: null,
      owner: null,
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: ['energy-rich']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Metallon',
      position: { x: 600, y: 400 },
      size: 'medium',
      population: 40,
      maxPopulation: 120,
      resources: { energy: 40, minerals: 70 },
      resourceOutput: { energy: 6, minerals: 12, research: 3 },
      ownerId: null,
      owner: null,
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: ['mineral-rich']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Scientifica',
      position: { x: 350, y: 350 },
      size: 'small',
      population: 30,
      maxPopulation: 80,
      resources: { energy: 30, minerals: 30 },
      resourceOutput: { energy: 5, minerals: 5, research: 15 },
      ownerId: null,
      owner: null,
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: ['research-focused']
    },
    {
      id: `planet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Industria',
      position: { x: 650, y: 650 },
      size: 'small',
      population: 30,
      maxPopulation: 80,
      resources: { energy: 30, minerals: 30 },
      resourceOutput: { energy: 5, minerals: 5, research: 15 },
      ownerId: null,
      owner: null,
      hasShipyard: false,
      defenseLevel: 1,
      specialFeatures: ['research-focused']
    }
  ];
  
  // Create phase lanes connecting planets
  const phaseLanes = [
    // Player 1 home system connections
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[0].id, planetId2: planets[1].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[0].id, planetId2: planets[7].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[1].id, planetId2: planets[5].id },
    
    // Player 2 home system connections
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[2].id, planetId2: planets[3].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[2].id, planetId2: planets[8].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[3].id, planetId2: planets[6].id },
    
    // Central connections
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[4].id, planetId2: planets[5].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[4].id, planetId2: planets[6].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[4].id, planetId2: planets[7].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[4].id, planetId2: planets[8].id },
    
    // Extra strategic connections
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[5].id, planetId2: planets[6].id },
    { id: `lane_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, planetId1: planets[7].id, planetId2: planets[8].id }
  ];
  
  // Create starting fleets for each player
  const fleets = [
    // Player 1 starting fleet
    {
      id: `fleet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Alpha Defense Fleet',
      position: { x: planets[0].position.x, y: planets[0].position.y },
      strength: 100,
      speed: 5,
      ownerId: player1Id,
      owner: { id: player1Id, color: player1Color },
      originPlanetId: planets[0].id,
      destinationPlanetId: null,
      moving: false,
      arrivalTime: null,
      orders: null,
      ships: [
        { type: 'fighter', count: 5 },
        { type: 'cruiser', count: 2 },
        { type: 'scout', count: 3 }
      ]
    },
    
    // Player 2 starting fleet
    {
      id: `fleet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Omega Defense Fleet',
      position: { x: planets[2].position.x, y: planets[2].position.y },
      strength: 100,
      speed: 5,
      ownerId: player2Id,
      owner: { id: player2Id, color: player2Color },
      originPlanetId: planets[2].id,
      destinationPlanetId: null,
      moving: false,
      arrivalTime: null,
      orders: null,
      ships: [
        { type: 'fighter', count: 5 },
        { type: 'cruiser', count: 2 },
        { type: 'scout', count: 3 }
      ]
    }
  ];
  
  return { planets, phaseLanes, fleets };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Heartbeat handler to keep connections alive
  socket.on('heartbeat', (data) => {
    // Just respond with an acknowledgement
    // console.log(`Heartbeat received from ${socket.playerName || socket.id}`); // Uncomment for debugging
    socket.emit('heartbeat-ack', { timestamp: Date.now() });
  });
  
  // Player identification
  socket.on('identify', (data) => {
    // Always generate a new server-side playerId regardless of what client sent
    const playerId = `server_player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const playerName = data.playerName || `Player_${playerId.substring(0, 5)}`;
    
    console.log(`Player identified: ${playerName} with new ID: ${playerId}`);
    
    // Store player info on the socket
    socket.playerId = playerId;
    socket.playerName = playerName;
    
    // Send confirmation to the client with the new guaranteed ID
    socket.emit('identifyConfirm', { 
      playerId: playerId,
      playerName: playerName,
      success: true,
      message: 'Successfully connected to server with new ID'
    });
    
    // Join lobby right away
    socket.join('lobby');
    
    // Broadcast player list to lobby
    const players = [];
    io.sockets.sockets.forEach(s => {
      if (s.playerName) {
        players.push({
          id: s.playerId || 'unknown',
          name: s.playerName
        });
      }
    });
    
    io.to('lobby').emit('playerList', players);
  });
  
  // Create game
  socket.on('createGame', (data) => {
    console.log(`Player ${socket.playerName} (${socket.playerId}) is creating a game:`, data);
    
    // Handle missing data
    if (!data) {
      console.log('Game creation received with no data');
      data = {};
    }
    
    // Generate a unique game ID
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Create game object with default values if needed
    const game = {
      id: gameId,
      name: data.gameName || `${socket.playerName}'s Game`,
      host: {
        id: socket.playerId,
        name: socket.playerName
      },
      players: [{
        id: socket.playerId,
        name: socket.playerName
      }],
      maxPlayers: data.maxPlayers || 4,
      status: 'waiting'
    };
    
    console.log(`Game created: ${game.name} (${gameId})`);
    
    // Store game in memory (could be moved to database later)
    const games = socket.games || {};
    games[gameId] = game;
    socket.games = games;
    
    // Join the game room
    socket.join(gameId);
    socket.gameId = gameId;
    
    // Send confirmation to the creator
    socket.emit('gameCreated', { success: true, game });
    
    // Broadcast game list update to all players in the lobby
    io.to('lobby').emit('gameCreated', game);
  });
  
  // Start game and generate map
  socket.on('startGame', (gameId) => {
    if (!socket.playerId || !socket.games || !socket.games[gameId]) {
      socket.emit('gameStarted', { success: false, error: 'Game not found' });
      return;
    }
    
    const game = socket.games[gameId];
    
    // Only the game creator can start the game
    if (game.players[0].id !== socket.playerId) {
      socket.emit('gameStarted', { success: false, error: 'Only the game creator can start the game' });
      return;
    }
    
    // Check if we have enough players
    if (game.players.length < 2) {
      socket.emit('gameStarted', { success: false, error: 'Need at least 2 players to start' });
      return;
    }
    
    // Generate map if it hasn't been generated yet
    if (game.planets.length === 0) {
      const playerIds = game.players.map(p => p.id);
      const mapData = generateTwoPlayerMap(playerIds);
      
      // Update the game with map data
      game.planets = mapData.planets;
      game.phaseLanes = mapData.phaseLanes;
      game.fleets = mapData.fleets;
      game.status = 'active';
      
      // Save the updated game
      socket.games[gameId] = game;
      
      // Notify all players in the game
      io.to(gameId).emit('gameStarted', { success: true, gameId });
      io.to(gameId).emit('gameState', game);
    }
  });
  
  // Join game
  socket.on('joinGame', (gameId) => {
    if (socket.playerId) {
      socket.join(gameId);
      socket.gameId = gameId;
      
      // Add player to game
      const player = {
        id: socket.playerId,
        name: socket.playerName,
        color: '#3498DB', // Blue color for second player
        resources: { energy: 100, minerals: 100, credits: 1000 },
        research: { military: 0, economy: 0, technology: 0 },
        score: 0,
        isActive: true,
        isReady: true
      };
      
      // Broadcast to game room
      io.to(gameId).emit('playerJoined', player);
    }
  });
  
  // Get game state handler
  socket.on('getGameState', (gameId) => {
    console.log(`Player ${socket.playerName} requested game state for ${gameId}`);
    
    // Check if games object exists
    const games = socket.games || {};
    const game = games[gameId];
    
    if (!game) {
      // If game doesn't exist, create a dummy game state with all required properties
      const emptyGameState = {
        id: gameId,
        name: 'New Game',
        players: [
          {
            id: socket.playerId,
            name: socket.playerName,
            color: '#FF5733',
            resources: { energy: 100, minerals: 100, credits: 1000 },
            research: { military: 0, economy: 0, technology: 0 },
            score: 0,
            isActive: true,
            isReady: true
          }
        ],
        planets: [],
        fleets: [],
        phaseLanes: [], // Corrected property name from phaseLines to phaseLanes
        turn: 0,
        status: 'waiting',
        winner: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          mapSize: 'medium',
          resources: 'standard',
          startingFleets: 1,
          winCondition: 'conquest'
        },
        messages: [],
        activePlayerId: socket.playerId // Set the active player to the creator
      };
      
      // Store the game for future reference
      games[gameId] = emptyGameState;
      socket.games = games;
      
      // Join the game room
      socket.join(gameId);
      socket.gameId = gameId;
      
      console.log(`Created empty game state for ${gameId}`);
      socket.emit('gameState', emptyGameState);
      return;
    }
    
    // Generate map immediately for the first player
    if (!game.planets || game.planets.length === 0) {
      // Generate a balanced map with the first player
      console.log(`Generating immediate map for game ${gameId} with player ${socket.playerName}`);
      
      const playerIds = game.players.map(p => p.id);
      const mapData = generateTwoPlayerMap(playerIds);
      
      // Update the game with map data
      game.planets = mapData.planets;
      game.phaseLanes = mapData.phaseLanes;
      game.fleets = mapData.fleets;
      game.status = 'active';
      
      console.log(`Map generated for game ${gameId} with ${game.planets.length} planets and ${game.fleets.length} fleets`);
      
      // Save the updated game
      games[gameId] = game;
      socket.games = games;
      
      // Broadcast the updated game state to all players in the game
      io.to(gameId).emit('gameState', game);
    } else {
      // Return the existing game state to the client
      console.log(`Sending existing game state for ${gameId}`);
      socket.emit('gameState', game);
    }
  });
  
  // Command handler for generalized client commands
  socket.on('command', (command) => {
    console.log(`Received command from ${socket.playerName}:`, command);
    
    if (!command || !command.type) {
      socket.emit('commandResponse', {
        success: false,
        message: 'Invalid command format'
      });
      return;
    }
    
    // Handle different command types
    switch (command.type) {
      case 'CREATE_GAME':
        // Create a game using the command data
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        
        const game = {
          id: gameId,
          name: command.gameName || `${socket.playerName}'s Game`,
          host: {
            id: socket.playerId,
            name: socket.playerName
          },
          players: [{
            id: socket.playerId,
            name: socket.playerName
          }],
          maxPlayers: command.maxPlayers || 4,
          status: 'waiting'
        };
        
        console.log(`Game created via command: ${game.name} (${gameId})`);
        
        // Store game in memory
        const games = socket.games || {};
        games[gameId] = game;
        socket.games = games;
        
        // Join the game room
        socket.join(gameId);
        socket.gameId = gameId;
        
        // Send confirmation to the creator
        socket.emit('commandResponse', {
          success: true,
          data: game
        });
        
        // Broadcast game list update to lobby
        io.to('lobby').emit('gameCreated', game);
        
        // Send updated game list to everyone
        const gameList = Object.values(games);
        io.to('lobby').emit('gameList', gameList);
        break;
        
      case 'JOIN_GAME':
        // Handle join game command
        if (!command.gameId) {
          socket.emit('commandResponse', {
            success: false,
            message: 'Game ID is required'
          });
          return;
        }
        
        // Join the specified game room
        socket.join(command.gameId);
        socket.gameId = command.gameId;
        
        // Add player to the game
        const player = {
          id: socket.playerId,
          name: socket.playerName
        };
        
        // Broadcast to game room
        io.to(command.gameId).emit('playerJoined', player);
        
        // Send success response to player
        socket.emit('commandResponse', {
          success: true,
          data: { id: command.gameId }
        });
        break;
        
      case 'GET_GAME_LIST':
        // Send current list of games
        const allGames = Object.values(socket.games || {});
        socket.emit('gameList', allGames);
        break;
        
      default:
        socket.emit('commandResponse', {
          success: false,
          message: `Unknown command type: ${command.type}`
        });
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Handle player leaving games and lobbies
    if (socket.gameId) {
      io.to(socket.gameId).emit('playerLeft', {
        id: socket.playerId,
        name: socket.playerName
      });
    }
    
    // Update player list
    const players = [];
    io.sockets.sockets.forEach(s => {
      if (s.playerName) {
        players.push({
          id: s.playerId,
          name: s.playerName
        });
      }
    });
    
    io.to('lobby').emit('playerList', players);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
