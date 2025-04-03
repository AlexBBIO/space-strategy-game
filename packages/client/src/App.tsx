import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import LoginPage from './pages/LoginPage';
import { SocketProvider } from './contexts/SocketContext';
import { Player } from '@space-strategy-game/shared';
import { usePlayerStore } from './stores/playerStore';

function App() {
  const { player, setPlayer } = usePlayerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if player is stored in localStorage
    const storedPlayer = localStorage.getItem('player');
    if (storedPlayer) {
      try {
        const parsedPlayer = JSON.parse(storedPlayer) as Player;
        setPlayer(parsedPlayer);
      } catch (error) {
        console.error('Failed to parse stored player:', error);
        localStorage.removeItem('player');
      }
    }
    
    setLoading(false);
  }, [setPlayer]);

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>Loading Space Strategy Game...</h1>
      </div>
    );
  }

  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/lobby" 
          element={player ? <LobbyPage /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/game/:gameId" 
          element={player ? <GamePage /> : <Navigate to="/login" replace />} 
        />
        <Route path="/" element={<Navigate to={player ? "/lobby" : "/login"} replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default App;
