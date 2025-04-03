const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
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

// Set up Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Same as above - allow all in development
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        console.log(`Socket origin ${origin} is connecting`);
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Define port
const PORT = process.env.PORT || 3001;

// Basic API route
app.get('/api', (req, res) => {
  res.json({
    message: 'Space Strategy Game Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Player identification
  socket.on('identify', (data) => {
    console.log(`Player identified: ${data.playerName} (${data.playerId})`);
    socket.playerId = data.playerId;
    socket.playerName = data.playerName;
    
    // Join lobby
    socket.join('lobby');
    
    // Broadcast player list to lobby
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
