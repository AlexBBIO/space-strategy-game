import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
// Only activate demo mode when specifically requested via URL parameter
const useDemo = new URLSearchParams(window.location.search).has('demo');

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
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectionDelayRef = useRef(2000);
  
  console.log(`Socket initialization - Demo mode: ${isDemo ? 'ACTIVE' : 'INACTIVE'}`);

  useEffect(() => {
    // Don't create a connection if we're in demo mode
    if (isDemo) {
      console.log('Running in demo mode, skipping socket connection');
      return;
    }
    
    // Initialize socket connection with more robust config
    const socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectionDelayRef.current,
      timeout: 10000, // 10 second connection timeout
      transports: ['websocket', 'polling'],
    });
    
    socketRef.current = socketInstance;

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected!');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      reconnectionDelayRef.current = 2000; // Reset delay on successful connection
      
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

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected! Reason:', reason);
      setIsConnected(false);
      
      // If the server disconnected us, try to reconnect manually
      if (reason === 'io server disconnect') {
        console.log('Server disconnected us, attempting to reconnect...');
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      reconnectAttemptsRef.current += 1;
      console.log(`Connection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} failed`);      
      
      // Implement exponential backoff for reconnection
      reconnectionDelayRef.current = Math.min(reconnectionDelayRef.current * 1.5, 10000); // Cap at 10 seconds
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error(`Failed to connect after ${maxReconnectAttempts} attempts`);
        // Don't try to reconnect automatically anymore
        socketInstance.disconnect();
      }
    });
    
    // Add error handler
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set the socket in state
    setSocket(socketInstance);
    
    // Add heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socketInstance.connected) {
        console.log('Sending heartbeat...');
        socketInstance.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30 second heartbeat interval

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection...');
      clearInterval(heartbeatInterval);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [isDemo]); // Only recreate socket if demo mode changes, not on player changes

  return (
    <SocketContext.Provider value={{ socket, isConnected, isDemo }}>
      {children}
    </SocketContext.Provider>
  );
};
