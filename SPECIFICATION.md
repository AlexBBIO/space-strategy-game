# Space Strategy Game - Technical Specification

## Overview
Space Strategy Game is a real-time multiplayer strategy game where players command fleets, colonize planets, and compete for galactic dominance. The game is built using modern web technologies and follows a client-server architecture.

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
- **Deployment**: Netlify (client), Render/Heroku (server)
- **Containerization**: Docker

## Client (Frontend)

### Key Components
- **SocketContext**: Manages real-time communication with the server
- **GalaxyMap**: Renders the game universe with planets and fleets
- **PlanetDetails**: Shows information about selected planets
- **FleetControls**: Handles fleet movement and combat
- **EmpireStats**: Displays player statistics and rankings

### State Management
The application uses Zustand for state management, with the following stores:
- **playerStore**: Manages the current player's state and authentication

### Build & Deployment
The client is built using Vite and deployed to Netlify:
1. Build command: `npm run build:shared && npm run build:client`
2. Output directory: `packages/client/dist`
3. URL: https://space-strategy-game.windsurf.build

## Server (Backend)

### Core Components
- **GameEngine**: Handles game state and logic
- **SocketManager**: Manages client connections and messaging
- **Repositories**: Interface for data persistence

### Data Models
- **Game**: Represents a game session
- **Player**: Represents a user in the game
- **Planet**: Represents a celestial body that can be controlled
- **Fleet**: Represents a group of ships that can move and fight
- **PhaseLane**: Represents a connection between planets

### API Endpoints
- **Socket.IO Events**:
  - `identify`: Player identification
  - `createGame`: Create a new game
  - `joinGame`: Join an existing game
  - `sendFleet`: Send a fleet to another planet
  - `updateGame`: Game state updates

### Deployment Options
1. **Render.com** (Recommended):
   - Build Command: `cd server-deploy && npm install`
   - Start Command: `cd server-deploy && node index.js`

2. **Heroku**:
   - Uses the Procfile in server-deploy
   - Command: `web: node index.js`

3. **Railway.app**:
   - Connect GitHub repository
   - Point to server-deploy directory

## Deployment Workflow

### Client Deployment (Netlify)
```bash
# Build the client
npm run build

# Deploy to Netlify
netlify deploy --prod --dir packages/client/dist --functions netlify/functions
```

### Server Deployment
```bash
# Navigate to server directory
cd server-deploy

# Install dependencies
npm install

# Start the server
node index.js
```

## Docker Support
The application includes Docker configurations for both client and server:
- `Dockerfile.client`: Client container configuration
- `Dockerfile.server`: Server container configuration
- `docker-compose.yml`: Multi-container configuration

To run with Docker:
```bash
docker-compose up
```

## Known Limitations
1. **Socket.IO on Netlify**: Netlify Functions don't support persistent WebSocket connections, requiring a separate server deployment for multiplayer functionality.
2. **Demo Mode**: When the server is unavailable, the client falls back to a demo mode with limited functionality.

## Future Enhancements
1. **Authentication System**: Implement user accounts and persistent player profiles
2. **Advanced Combat System**: Add multiple ship types and combat strategies
3. **Economy System**: Implement resource gathering and management
4. **AI Opponents**: Add computer-controlled opponents for single-player mode

## GitHub Repository
The project is hosted on GitHub at: https://github.com/AlexBBIO/space-strategy-game

## Live Deployments
- **Client**: [https://space-strategy-game.windsurf.build](https://space-strategy-game.windsurf.build)
- **Server**: Not yet deployed (see Deployment Options section)
