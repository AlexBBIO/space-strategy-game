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
  
  // Player identification
  socket.on('identify', (data) => {
    // Generate a playerId if none is provided
    const playerId = data.playerId || `server_player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const playerName = data.playerName || `Player_${playerId.substring(0, 5)}`;
    
    console.log(`Player identified: ${playerName} (${playerId})`);
    
    // Store player info on the socket
    socket.playerId = playerId;
    socket.playerName = playerName;
    
    // Send confirmation to the client with their ID
    socket.emit('identifyConfirm', { 
      playerId: playerId,
      playerName: playerName,
      success: true,
      message: 'Successfully connected to server'
    });
    
    // Join lobby
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
    const gameId = `game_${Date.now()}`;
    const game = {
      id: gameId,
      name: data.gameName,
      host: {
        id: socket.playerId,
        name: socket.playerName
      },
      players: [{
        id: socket.playerId,
        name: socket.playerName
      }],
      maxPlayers: data.maxPlayers,
      status: 'waiting'
    };
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    // Broadcast game list update
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
