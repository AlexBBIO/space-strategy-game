import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { usePlayerStore } from '../stores/playerStore';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--color-background);
  background-image: radial-gradient(circle at 50% 50%, rgba(92, 76, 229, 0.1) 0%, transparent 70%);
`;

const LoginCard = styled.div`
  background-color: var(--color-background-secondary);
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.5s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-primary);
`;

const InputGroup = styled.div`
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

const Button = styled.button`
  width: 100%;
  padding: 0.75rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--color-primary-light);
  }

  &:disabled {
    background-color: var(--color-neutral);
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: var(--color-danger);
  margin-top: 1rem;
  text-align: center;
`;

const LoginPage = () => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { player, setPlayer } = usePlayerStore();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (player) {
      navigate('/lobby');
    }
  }, [player, navigate]);

  // Set up socket identity event listener
  useEffect(() => {
    if (!socket) return;

    const handleIdentity = (response: any) => {
      setIsLoading(false);
      
      if (response.success) {
        setPlayer(response.player);
        navigate('/lobby');
      } else {
        setError(response.message || 'Failed to log in');
      }
    };

    socket.on('identity', handleIdentity);

    return () => {
      socket.off('identity', handleIdentity);
    };
  }, [socket, setPlayer, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    setIsLoading(true);
    socket?.emit('identify', { playerName });
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Space Strategy Game</Title>
        <form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="playerName">Commander Name</Label>
            <Input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
              autoFocus
            />
          </InputGroup>
          <Button type="submit" disabled={isLoading || !isConnected}>
            {isLoading ? 'Connecting...' : 'Enter the Galaxy'}
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {!isConnected && !isLoading && (
            <ErrorMessage>
              Not connected to server. Please wait or refresh the page.
            </ErrorMessage>
          )}
        </form>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
