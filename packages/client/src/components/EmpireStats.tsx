import styled from 'styled-components';
import { Player, GameState } from '@space-strategy-game/shared';

interface EmpireStatsProps {
  player: Player | null;
  gameState: GameState;
}

const Container = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlayerColor = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const StatCard = styled.div`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--color-primary);
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PlayerItem = styled.div<{ isCurrentPlayer: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.isCurrentPlayer ? 'rgba(92, 76, 229, 0.1)' : 'transparent'};
  border-radius: 4px;
`;

const PlayerInfo = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-size: 0.875rem;
`;

const PlayerStats = styled.div`
  font-size: 0.75rem;
  color: var(--color-text-secondary);
`;

const SectionTitle = styled.h3`
  margin: 0.5rem 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
`;

const EmpireStats = ({ player, gameState }: EmpireStatsProps) => {
  if (!player) return null;
  
  // Calculate empire statistics
  const calculateEmpireStats = () => {
    const playerPlanets = gameState.planets.filter(p => p.ownerId === player.id);
    const playerFleets = gameState.fleets.filter(f => f.ownerId === player.id);
    
    // Calculate total fleet strength
    const totalFleetStrength = playerFleets.reduce((sum, fleet) => sum + fleet.strength, 0);
    
    // Calculate total population
    const totalPopulation = playerFleets.reduce((sum, planet) => {
      if (planet.ownerId === player.id) {
        return sum + planet.population;
      }
      return sum;
    }, 0);
    
    // Calculate total shipyards
    const totalShipyards = playerPlanets.reduce((sum, planet) => {
      return sum + (planet.hasShipyard ? 1 : 0);
    }, 0);
    
    return {
      planets: playerPlanets.length,
      fleets: playerFleets.length,
      totalFleetStrength: Math.floor(totalFleetStrength),
      totalPopulation: Math.floor(totalPopulation),
      shipyards: totalShipyards
    };
  };
  
  // Calculate player rankings
  const calculatePlayerRankings = () => {
    return gameState.players.map(p => {
      const playerPlanets = gameState.planets.filter(planet => planet.ownerId === p.id);
      const playerFleets = gameState.fleets.filter(fleet => fleet.ownerId === p.id);
      
      // Calculate total power (simple metric: planets + fleet strength)
      const planetCount = playerPlanets.length;
      const fleetStrength = playerFleets.reduce((sum, fleet) => sum + fleet.strength, 0);
      const totalPower = planetCount * 10 + fleetStrength;
      
      return {
        player: p,
        planets: planetCount,
        fleets: playerFleets.length,
        totalPower: Math.floor(totalPower)
      };
    }).sort((a, b) => b.totalPower - a.totalPower); // Sort by power (descending)
  };
  
  const empireStats = calculateEmpireStats();
  const playerRankings = calculatePlayerRankings();
  
  return (
    <Container>
      <Header>
        <PlayerColor color={player.color} />
        <HeaderTitle>Empire Overview</HeaderTitle>
      </Header>
      
      <StatsGrid>
        <StatCard>
          <StatValue>{empireStats.planets}</StatValue>
          <StatLabel>Planets</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{empireStats.fleets}</StatValue>
          <StatLabel>Fleets</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{empireStats.totalFleetStrength}</StatValue>
          <StatLabel>Military Strength</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{empireStats.shipyards}</StatValue>
          <StatLabel>Shipyards</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <SectionTitle>Player Rankings</SectionTitle>
      <PlayerList>
        {playerRankings.map(ranking => (
          <PlayerItem 
            key={ranking.player.id}
            isCurrentPlayer={ranking.player.id === player.id}
          >
            <PlayerColor color={ranking.player.color} />
            <PlayerInfo>
              <PlayerName>{ranking.player.name}</PlayerName>
              <PlayerStats>
                {ranking.planets} planets | {ranking.fleets} fleets
              </PlayerStats>
            </PlayerInfo>
            <div>
              {ranking.totalPower}
            </div>
          </PlayerItem>
        ))}
      </PlayerList>
    </Container>
  );
};

export default EmpireStats;
