import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePlayerStore } from '../stores/playerStore';

// Check if running in production (Netlify) or development environment
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');

// Define server URL based on environment
// In development, connect to localhost, in production use our Render.com deployment
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (isProduction ? 'https://space-strategy-game-server.onrender.com' : 'http://localhost:3001');

// For non-socket API requests, use this URL
export const API_URL = isProduction ? '/.netlify/functions/game-api' : 'http://localhost:3001/api';

// Check for demo mode (no server)
const useDemo = new URLSearchParams(window.location.search).has('demo') || isProduction;

console.log(`Environment: ${isProduction ? 'Production' : 'Development'}, Using server: ${SERVER_URL}, Demo mode: ${useDemo}`);

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isDemo: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isDemo: useDemo
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemo] = useState(useDemo);
  const { player } = usePlayerStore();

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected!');
      setIsConnected(true);
      
      // Identify player if available
      if (player) {
        console.log('Identifying player:', player.name, 'with ID:', player.id || 'generating new ID');
        socketInstance.emit('identify', { 
          playerId: player.id,
          playerName: player.name 
        });
      } else {
        console.log('No player data available, using anonymous login');
        // Send anonymous identify if no player data exists
        socketInstance.emit('identify', { 
          playerName: `Guest_${Math.floor(Math.random() * 1000)}` 
        });
      }
    });
    
    // Handle identity confirmation from server
    socketInstance.on('identifyConfirm', (data) => {
      console.log('Identity confirmed by server:', data);
      
      // If the server assigned a new ID, update our local player
      if (data.playerId && (!player || player.id !== data.playerId)) {
        const { setPlayer } = usePlayerStore.getState();
        setPlayer({
          id: data.playerId,
          name: data.playerName || player?.name || `Player_${data.playerId.substring(0, 5)}`,
          color: player?.color || getRandomColor() // Generate a random color if needed
        });
      }
    });
    
    // Helper function to generate a random color
    function getRandomColor() {
      const colors = [
        '#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3',
        '#33FFF3', '#F333FF', '#FF3333', '#33FF33', '#3333FF'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected!');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Set the socket in state
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [player]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isDemo }}>
      {children}
    </SocketContext.Provider>
  );
};
