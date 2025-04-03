import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { usePlayerStore } from '../stores/playerStore';
import { GameState, Planet, Fleet, PhaseLane, Player } from '@space-strategy-game/shared';
import GalaxyMap from '../components/GalaxyMap';
import PlanetDetails from '../components/PlanetDetails';
import FleetControls from '../components/FleetControls';
import EmpireStats from '../components/EmpireStats';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-background);
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--color-background-secondary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-primary);
`;

const GameControls = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const MapContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: var(--color-background-secondary);
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const LoadingScreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background);
  z-index: 100;
`;

const MessageLog = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  width: calc(100% - 320px);
  max-height: 150px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 0.5rem;
  overflow-y: auto;
  font-size: 0.875rem;
  z-index: 5;
`;

const MessageEntry = styled.div`
  margin-bottom: 0.25rem;
  padding: 0.25rem;
  border-radius: 2px;
  animation: fadeIn 0.3s;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { socket, isConnected } = useSocket();
  const { player } = usePlayerStore();
  const navigate = useNavigate();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up socket listeners for game state updates
  useEffect(() => {
    if (!socket || !gameId) return;

    const handleGameState = (state: GameState) => {
      setGameState(state);
      setIsLoading(false);
    };

    const handleGameStateUpdate = (state: GameState) => {
      setGameState(state);
    };

    const handleGameStarted = (state: GameState) => {
      setGameState(state);
      setIsLoading(false);
      addMessage('Game has started! May the best commander win!');
    };

    const handleError = (error: any) => {
      addMessage(`Error: ${error.message}`);
    };

    socket.on('gameState', handleGameState);
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('gameStarted', handleGameStarted);
    socket.on('error', handleError);

    // Request initial game state
    socket.emit('getGameState', gameId);

    return () => {
      socket.off('gameState', handleGameState);
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('error', handleError);
    };
  }, [socket, gameId]);

  // Scroll to the bottom of the message log when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, message]);
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  const handlePlanetClick = (planet: Planet) => {
    setSelectedPlanet(planet);
    setSelectedFleet(null);
    addMessage(`Selected ${planet.name}`);
  };

  const handleFleetClick = (fleet: Fleet) => {
    setSelectedFleet(fleet);
    setSelectedPlanet(null);
    addMessage(`Selected fleet with strength ${fleet.strength}`);
  };

  const handleMoveFleet = (fleet: Fleet, destinationPlanet: Planet) => {
    if (!socket) return;

    socket.emit('command', {
      type: 'MOVE_FLEET',
      fleetId: fleet.id,
      destinationPlanetId: destinationPlanet.id
    });

    addMessage(`Ordered fleet to move to ${destinationPlanet.name}`);
  };

  const handleSplitFleet = (fleet: Fleet, percentage: number) => {
    if (!socket) return;

    socket.emit('command', {
      type: 'SPLIT_FLEET',
      fleetId: fleet.id,
      percentage
    });

    addMessage(`Splitting fleet (${percentage}%)`);
  };

  const isPlayersTurn = (player: Player | null) => {
    // In this game, all players make moves simultaneously
    return true;
  };

  if (isLoading) {
    return (
      <LoadingScreen>
        <h2>Loading Galaxy...</h2>
        <p>Establishing connection to the galactic network...</p>
      </LoadingScreen>
    );
  }

  if (!gameState) {
    return (
      <LoadingScreen>
        <h2>Error</h2>
        <p>Could not load game data. Please return to the lobby.</p>
        <Button onClick={handleBackToLobby}>Back to Lobby</Button>
      </LoadingScreen>
    );
  }

  return (
    <GameContainer>
      <Header>
        <Title>Space Strategy - {gameId}</Title>
        <GameControls>
          <Button onClick={handleBackToLobby}>Back to Lobby</Button>
        </GameControls>
      </Header>
      
      <Content>
        <MapContainer>
          <GalaxyMap
            planets={gameState.planets}
            phaseLines={gameState.phaseLines}
            fleets={gameState.fleets}
            currentPlayer={player}
            selectedPlanet={selectedPlanet}
            selectedFleet={selectedFleet}
            onPlanetClick={handlePlanetClick}
            onFleetClick={handleFleetClick}
          />
          
          <MessageLog>
            {messages.map((message, index) => (
              <MessageEntry key={index}>{message}</MessageEntry>
            ))}
            <div ref={messagesEndRef} />
          </MessageLog>
        </MapContainer>
        
        <Sidebar>
          <EmpireStats
            player={player}
            gameState={gameState}
          />
          
          {selectedPlanet && (
            <PlanetDetails
              planet={selectedPlanet}
              currentPlayer={player}
              fleets={gameState.fleets.filter(f => 
                !f.moving && f.originPlanetId === selectedPlanet.id
              )}
              onFleetClick={handleFleetClick}
            />
          )}
          
          {selectedFleet && (
            <FleetControls
              fleet={selectedFleet}
              planets={gameState.planets}
              phaseLines={gameState.phaseLines}
              canGiveOrders={selectedFleet.ownerId === player?.id && isPlayersTurn(player)}
              onMoveFleet={handleMoveFleet}
              onSplitFleet={handleSplitFleet}
            />
          )}
        </Sidebar>
      </Content>
    </GameContainer>
  );
};

export default GamePage;
