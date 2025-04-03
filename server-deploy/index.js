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
  
  // Join game
  socket.on('joinGame', (gameId) => {
    if (socket.playerId) {
      socket.join(gameId);
      socket.gameId = gameId;
      
      // Add player to game
      const player = {
        id: socket.playerId,
        name: socket.playerName
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
      // If game doesn't exist, create a dummy game state
      const emptyGameState = {
        id: gameId,
        name: 'New Game',
        players: [
          {
            id: socket.playerId,
            name: socket.playerName,
            color: '#FF5733'
          }
        ],
        planets: [],
        fleets: [],
        phaseLines: [],
        turn: 0,
        status: 'waiting'
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
    
    // Return the game state to the client
    console.log(`Sending game state for ${gameId}`);
    socket.emit('gameState', game);
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
