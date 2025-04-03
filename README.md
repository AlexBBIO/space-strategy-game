# Multiplayer Space Strategy Game

A web-based multiplayer strategy game where players command fleets, move them between planets via phase lanes, engage in combat to conquer planets, and utilize planets to generate more fleet strength. The game operates in slow real-time.

## Live Demo

Play the game online: [Space Strategy Game](https://space-strategy-game.windsurf.build)

## Project Structure

This is a monorepo project with the following packages:

- `packages/client`: React frontend with TypeScript and Vite
- `packages/server`: Node.js backend with Express and Socket.io
- `packages/shared`: Shared type definitions used by both client and server
- `server-deploy`: Standalone server for WebSocket deployment
- `netlify/functions`: Serverless functions for the Netlify deployment

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/space-strategy-game.git
   cd space-strategy-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development servers:
   ```
   npm start
   ```

## Game Features

- Galaxy map with planets and phase lanes
- Fleet movement and combat system
- Planet control and resource generation
- Real-time multiplayer gameplay with lobby system
- Player rankings and statistics

## Development

- `npm start`: Run both client and server in development mode
- `npm run build:shared`: Build the shared package
- `npm run build:client`: Build the client package
- `npm run build:server`: Build the server package
- `npm run build`: Build shared and client packages for production

## Deployment

### Client

The client is deployed to Netlify:

```
npm run build
npm install -g netlify-cli
netlify deploy --prod --dir packages/client/dist
```

### Server

The server can be deployed to any platform that supports WebSockets:

```
cd server-deploy
npm install
node index.js
```

## Docker

The project includes Docker configurations for both client and server:

```
docker-compose up
```
