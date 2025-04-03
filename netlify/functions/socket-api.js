// Socket API mock for Netlify
const games = {};
const players = {};

exports.handler = async function(event, context) {
  const path = event.path.replace('/.netlify/functions/socket-api', '');
  const method = event.httpMethod;
  
  // Parse request body if it exists
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
  }
  
  // Handle different API endpoints
  if (method === 'GET' && path === '/games') {
    // Return all available games
    return {
      statusCode: 200,
      body: JSON.stringify(Object.values(games)),
      headers: { "Content-Type": "application/json" }
    };
  }
  
  if (method === 'GET' && path === '/players') {
    // Return all available players
    return {
      statusCode: 200,
      body: JSON.stringify(Object.values(players)),
      headers: { "Content-Type": "application/json" }
    };
  }
  
  if (method === 'POST' && path === '/player') {
    // Register a player
    const { name, id } = body;
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Player name is required" })
      };
    }
    
    const playerId = id || `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    players[playerId] = {
      id: playerId,
      name,
      lastSeen: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        id: playerId,
        name,
        success: true 
      }),
      headers: { "Content-Type": "application/json" }
    };
  }
  
  if (method === 'POST' && path === '/game') {
    // Create a new game
    const { name, hostId, maxPlayers } = body;
    if (!name || !hostId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Game name and host ID are required" })
      };
    }
    
    const gameId = `game_${Date.now()}`;
    const host = players[hostId];
    
    if (!host) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Host player not found" })
      };
    }
    
    games[gameId] = {
      id: gameId,
      name,
      host: {
        id: host.id,
        name: host.name
      },
      players: [{ id: host.id, name: host.name }],
      maxPlayers: maxPlayers || 4,
      status: 'waiting',
      created: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        gameId,
        success: true,
        game: games[gameId]
      }),
      headers: { "Content-Type": "application/json" }
    };
  }
  
  if (method === 'POST' && path === '/game/join') {
    // Join a game
    const { gameId, playerId } = body;
    if (!gameId || !playerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Game ID and player ID are required" })
      };
    }
    
    const game = games[gameId];
    const player = players[playerId];
    
    if (!game) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Game not found" })
      };
    }
    
    if (!player) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Player not found" })
      };
    }
    
    // Check if player is already in game
    const alreadyInGame = game.players.some(p => p.id === player.id);
    if (!alreadyInGame) {
      game.players.push({
        id: player.id,
        name: player.name
      });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        game
      }),
      headers: { "Content-Type": "application/json" }
    };
  }
  
  // Default response for unknown routes
  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
    headers: { "Content-Type": "application/json" }
  };
};
