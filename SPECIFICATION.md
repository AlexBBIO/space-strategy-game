# Space Strategy Game - Technical Specification

## Overview
Space Strategy Game is a real-time multiplayer strategy game where players command fleets, colonize planets, and compete for galactic dominance. The game is built using modern web technologies and follows a client-server architecture with real-time WebSocket communication.

## Architecture

### Project Structure
```
space-strategy-game/
├── packages/
│   ├── client/         # React frontend
│   ├── server/         # Node.js backend (local development)
│   └── shared/         # Shared TypeScript types
├── server-deploy/      # Production-ready server deployment
├── netlify/            # Netlify serverless functions
└── ...
```

### Technology Stack
- **Frontend**: React, TypeScript, Vite, Zustand, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, TypeORM
- **Deployment**: Netlify (client), Render.com (server)
- **Communication**: Socket.IO for real-time bidirectional events

## Client (Frontend)

### Key Components
- **SocketContext**: Manages real-time communication with the server, handles player identification and connection state
- **GalaxyMap**: Renders the game universe with planets and fleets
- **PlanetDetails**: Shows information about selected planets
- **FleetControls**: Handles fleet movement and combat
- **EmpireStats**: Displays player statistics and rankings
- **LobbyPage**: Displays available games and allows creating new ones
- **LoginPage**: Handles player identification and initial connection

### State Management
The application uses Zustand for state management, with the following stores:
- **playerStore**: Manages the current player's state, including name, ID, and color
  - Handles player session persistence in localStorage
  - Generates unique player IDs when needed
  - Stores player preferences

### Build & Deployment
The client is built using Vite and deployed to Netlify:
1. Build command: `npm run build:shared && npm run build:client`
2. Output directory: `packages/client/dist`
3. URL: https://space-strategy-game.windsurf.build
4. Environment variables:
   - `VITE_SERVER_URL`: Points to the deployed server URL

## Server (Backend)

### Core Components
- **SocketManager**: Manages client connections, player identification, and game state
- **CommandHandler**: Processes client commands (CREATE_GAME, JOIN_GAME, etc.)
- **GameEngine**: Handles game state and logic

### Communication Protocol
The server implements two communication patterns:
1. **Direct Events**: Traditional Socket.IO events (`identify`, `getGameList`, etc.)
2. **Command Pattern**: Generic 'command' events with type field for different actions

### Socket.IO Events:
- **Server listening events**:
  - `identify`: Player identification
  - `command`: Generic command processing (CREATE_GAME, JOIN_GAME, etc.)
  - `createGame`: Create a new game
  - `joinGame`: Join an existing game
  - `getGameList`: Get list of available games

- **Server emitting events**:
  - `identifyConfirm`: Confirms player identity with server-assigned ID
  - `gameList`: List of available games
  - `gameCreated`: When a new game is created
  - `playerJoined`: When a player joins a game
  - `commandResponse`: Response to client commands

### Data Models
- **Player**: `{ id: string, name: string, color: string }`
- **Game**: Contains game metadata, players, and state
- **Planet**: Represents a celestial body that can be controlled
- **Fleet**: Represents a group of ships that can move and fight

### Deployment Details
The server is deployed on Render.com:
- **URL**: https://space-strategy-game-server.onrender.com
- **Configuration**:
  - Build Command: `cd server-deploy && npm install`
  - Start Command: `cd server-deploy && node index.js`
  - Environment: Node.js
  - Plan: Free tier

### Error Handling & Resilience
- Server generates unique player IDs to prevent identity issues
- Robust CORS configuration allows cross-origin requests
- Comprehensive error handling for socket events
- Graceful disconnection handling
- Command pattern for flexible client-server communication

## Deployment Workflow

### Client Deployment (Netlify)
```bash
# Build the shared types and client
npm run build:shared && npm run build:client

# Deploy to Netlify
netlify deploy --prod
```

### Server Deployment (Render.com)
Automatic deployment from GitHub repository:
1. Connect GitHub repository to Render.com
2. Configure build settings using render.yaml
3. Changes to server-deploy directory trigger automatic deployments

## Player Identification and Authentication

The game uses a simple identification system:
1. Players enter a name on the login screen
2. Client generates a unique ID for first-time players
3. Server always assigns a guaranteed unique ID on connection
4. Player data is stored in localStorage for persistence between sessions
5. Each player is assigned a random color for identification

## Game Creation and Joining

### Game Creation Process:
1. Player enters a game name and max players
2. Client sends CREATE_GAME command to server
3. Server creates game object with unique ID
4. Server adds creator as first player and host
5. Server broadcasts game creation to lobby
6. Client redirects to game screen

### Game Joining Process:
1. Player sees list of available games in lobby
2. Player clicks Join button for desired game
3. Client sends JOIN_GAME command to server
4. Server adds player to game room
5. Server broadcasts player joined event
6. Client redirects to game screen

## Known Limitations
1. **Socket.IO on Netlify**: Netlify Functions don't support persistent WebSocket connections, requiring separate server deployment on Render.com
2. **Demo Mode**: When the server is unavailable, the client falls back to a demo mode with limited functionality
3. **Persistence**: Game state is currently only held in memory on the server
4. **Authentication**: Simple identification system without true authentication

## Future Enhancements
1. **Database Integration**: Add MongoDB or PostgreSQL for persistent game state
2. **Enhanced Authentication**: Implement proper user accounts and authentication
3. **Advanced Game Mechanics**: Add economy, research, and ship types
4. **AI Opponents**: Add computer-controlled opponents for single-player mode
5. **Game History**: Track game results and player statistics

## Active Deployments
- **Client**: [https://space-strategy-game.windsurf.build](https://space-strategy-game.windsurf.build)
- **Server**: [https://space-strategy-game-server.onrender.com](https://space-strategy-game-server.onrender.com)

## GitHub Repository
The project is hosted on GitHub at: https://github.com/AlexBBIO/space-strategy-game

## Recent Improvements
1. Fixed player identification by implementing server-side ID generation
2. Added comprehensive command handling for client-server communication
3. Improved error handling and debugging on both client and server
4. Enhanced CORS configuration to allow cross-origin requests
5. Added Render.com configuration for easy server deployment
