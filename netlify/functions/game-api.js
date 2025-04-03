// Simple API endpoint for the game server
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Space Strategy Game API is running!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }),
    headers: {
      "Content-Type": "application/json"
    }
  };
};
