import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/connection';
import { SocketManager } from './socket/SocketManager';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Set up port
const PORT = process.env.PORT || 3001;

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Initialize Socket.io manager
    new SocketManager(server);
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
