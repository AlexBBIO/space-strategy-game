import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { usePlayerStore } from '../stores/playerStore';
import { GameLobby } from '@space-strategy-game/shared';

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-background);
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--color-background-secondary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-primary);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Username = styled.span`
  font-weight: 500;
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-text-secondary);
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  
  &:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
    background-color: transparent;
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  padding: 2rem;
  gap: 2rem;
  overflow: hidden;
`;

const GameList = styled.div`
  flex: 2;
  background-color: var(--color-background-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const GameListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const GameTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: rgba(0, 0, 0, 0.2);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(92, 76, 229, 0.1);
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
`;

const JoinButton = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
`;

const NewGamePanel = styled.div`
  flex: 1;
  background-color: var(--color-background-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  height: fit-content;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--color-text);
  font-size: 1rem;

  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--color-text);
  font-size: 1rem;

  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 0.75rem;
`;

const NoGamesMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  color: var(--color-text-secondary);
  text-align: center;
`;

const RefreshButton = styled.button`
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-text-secondary);
  margin-left: 1rem;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
    border-color: var(--color-text);
  }
`;

const ErrorMessage = styled.p`
  color: var(--color-danger);
  margin-top: 1rem;
`;

const LobbyPage = () => {
  const [games, setGames] = useState<GameLobby[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { socket, isConnected } = useSocket();
  const { player, clearPlayer } = usePlayerStore();
  const navigate = useNavigate();

  // Set up socket listeners for game list and command responses
  useEffect(() => {
    if (!socket) return;

    const handleGameList = (gameList: GameLobby[]) => {
      setGames(gameList);
    };

    const handleCommandResponse = (response: any) => {
      setIsLoading(false);
      
      if (response.success) {
        if (response.data && response.data.id) {
          // For create/join game responses, navigate to game screen
          navigate(`/game/${response.data.id}`);
        }
      } else {
        setError(response.message || 'An error occurred');
      }
    };

    socket.on('gameList', handleGameList);
    socket.on('commandResponse', handleCommandResponse);

    // Request initial game list
    socket.emit('getGameList');

    return () => {
      socket.off('gameList', handleGameList);
      socket.off('commandResponse', handleCommandResponse);
    };
  }, [socket, navigate]);

  const handleRefresh = () => {
    if (socket) {
      socket.emit('getGameList');
    }
  };

  const handleLogout = () => {
    clearPlayer();
    navigate('/login');
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newGameName.trim()) {
      setError('Please enter a game name');
      return;
    }

    if (!isConnected || !socket) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    socket.emit('command', {
      type: 'CREATE_GAME',
      gameName: newGameName,
      playerName: player?.name || '',
      maxPlayers
    });
  };

  const handleJoinGame = (gameId: string) => {
    if (!isConnected || !socket) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    socket.emit('command', {
      type: 'JOIN_GAME',
      gameId,
      playerName: player?.name || ''
    });
  };

  // Check if player is already in a game
  const isInGame = (game: GameLobby) => {
    return game.players.some(p => p.id === player?.id);
  };

  return (
    <LobbyContainer>
      <Header>
        <Title>Space Strategy Game - Lobby</Title>
        <UserInfo>
          <Username>Commander: {player?.name}</Username>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </UserInfo>
      </Header>
      
      <Content>
        <GameList>
          <GameListHeader>
            <h2>Available Games</h2>
            <RefreshButton onClick={handleRefresh}>
              Refresh
            </RefreshButton>
          </GameListHeader>
          
          {games.length > 0 ? (
            <GameTable>
              <TableHead>
                <tr>
                  <TableHeader>Game Name</TableHeader>
                  <TableHeader>Host</TableHeader>
                  <TableHeader>Players</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </TableHead>
              <tbody>
                {games.map(game => (
                  <TableRow key={game.id}>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>{game.host.name}</TableCell>
                    <TableCell>{game.players.length} / {game.maxPlayers}</TableCell>
                    <TableCell>{game.status}</TableCell>
                    <TableCell>
                      {isInGame(game) ? (
                        <JoinButton onClick={() => navigate(`/game/${game.id}`)}>
                          Resume
                        </JoinButton>
                      ) : (
                        <JoinButton 
                          onClick={() => handleJoinGame(game.id)}
                          disabled={isLoading || game.players.length >= game.maxPlayers}
                        >
                          Join
                        </JoinButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </GameTable>
          ) : (
            <NoGamesMessage>
              <p>No games available. Create one to start playing!</p>
            </NoGamesMessage>
          )}
        </GameList>
        
        <NewGamePanel>
          <h2>Create New Game</h2>
          <form onSubmit={handleCreateGame}>
            <FormGroup>
              <Label htmlFor="gameName">Game Name</Label>
              <Input
                id="gameName"
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Enter game name"
                disabled={isLoading}
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Select
                id="maxPlayers"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                disabled={isLoading}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} Players</option>
                ))}
              </Select>
            </FormGroup>
            
            <CreateButton type="submit" disabled={isLoading || !isConnected}>
              {isLoading ? 'Creating...' : 'Create Game'}
            </CreateButton>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </form>
        </NewGamePanel>
      </Content>
    </LobbyContainer>
  );
};

export default LobbyPage;
