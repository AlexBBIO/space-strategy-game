import { useState } from 'react';
import styled from 'styled-components';
import { Planet, Fleet, Player } from '@space-strategy-game/shared';

interface PlanetDetailsProps {
  planet: Planet;
  currentPlayer: Player | null;
  fleets: Fleet[];
  onFleetClick: (fleet: Fleet) => void;
}

const Container = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PlanetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PlanetIcon = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.color};
  box-shadow: 0 0 10px ${props => props.color};
`;

const PlanetInfo = styled.div`
  flex: 1;
`;

const PlanetName = styled.h2`
  margin: 0;
  font-size: 1.25rem;
`;

const PlanetOwner = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

const ResourcesPanel = styled.div`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
`;

const ResourceRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const ResourceLabel = styled.span`
  color: var(--color-text-secondary);
`;

const ResourceValue = styled.span`
  font-weight: 500;
`;

const ProgressBar = styled.div`
  height: 6px;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 0.25rem;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ percentage: number; color: string }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background-color: ${props => props.color};
`;

const FeaturesPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const FeatureTag = styled.div`
  background-color: rgba(92, 76, 229, 0.2);
  color: var(--color-text);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const SectionTitle = styled.h3`
  margin: 0.5rem 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
`;

const FleetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FleetItem = styled.div<{ isOwned: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid ${props => props.isOwned ? 'var(--color-success)' : 'var(--color-danger)'};
  
  &:hover {
    background-color: rgba(92, 76, 229, 0.1);
  }
`;

const FleetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FleetIcon = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background-color: ${props => props.color};
  transform: rotate(180deg);
`;

const FleetName = styled.span`
  font-size: 0.875rem;
`;

const FleetStrength = styled.span`
  font-weight: 500;
  font-size: 0.875rem;
`;

const PlanetDetails = ({ 
  planet, 
  currentPlayer, 
  fleets,
  onFleetClick
}: PlanetDetailsProps) => {
  // Determine the planet's color based on owner
  const planetColor = planet.owner ? planet.owner.color : '#808080';
  
  // Calculate population percentage
  const populationPercentage = (planet.population / planet.maxPopulation) * 100;
  
  // Check if current player owns this planet
  const isOwnPlanet = currentPlayer && planet.ownerId === currentPlayer.id;
  
  // Format population number for display
  const formatPopulation = (pop: number) => {
    if (pop >= 1000) {
      return `${(pop / 1000).toFixed(1)}K`;
    }
    return Math.floor(pop).toString();
  };

  return (
    <Container>
      <PlanetHeader>
        <PlanetIcon color={planetColor} />
        <PlanetInfo>
          <PlanetName>{planet.name}</PlanetName>
          <PlanetOwner>
            {planet.owner 
              ? `Controlled by ${planet.owner.name}` 
              : 'Uncolonized'}
          </PlanetOwner>
        </PlanetInfo>
      </PlanetHeader>
      
      <ResourcesPanel>
        <ResourceRow>
          <ResourceLabel>Population</ResourceLabel>
          <ResourceValue>
            {formatPopulation(planet.population)} / {formatPopulation(planet.maxPopulation)}
          </ResourceValue>
        </ResourceRow>
        <ProgressBar>
          <ProgressFill 
            percentage={populationPercentage} 
            color={planet.owner ? planet.owner.color : '#808080'} 
          />
        </ProgressBar>
        
        <ResourceRow>
          <ResourceLabel>Growth Rate</ResourceLabel>
          <ResourceValue>
            {(planet.populationGrowthRate * 100).toFixed(1)}% per tick
          </ResourceValue>
        </ResourceRow>
      </ResourcesPanel>
      
      <FeaturesPanel>
        {planet.hasShipyard && (
          <FeatureTag>
            <span>🚀</span> Shipyard
          </FeatureTag>
        )}
      </FeaturesPanel>
      
      {fleets.length > 0 && (
        <>
          <SectionTitle>Fleets at {planet.name}</SectionTitle>
          <FleetList>
            {fleets.map(fleet => (
              <FleetItem 
                key={fleet.id}
                isOwned={fleet.ownerId === currentPlayer?.id}
                onClick={() => onFleetClick(fleet)}
              >
                <FleetInfo>
                  <FleetIcon color={fleet.owner.color} />
                  <FleetName>{fleet.owner.name}'s Fleet</FleetName>
                </FleetInfo>
                <FleetStrength>Strength: {Math.floor(fleet.strength)}</FleetStrength>
              </FleetItem>
            ))}
          </FleetList>
        </>
      )}
    </Container>
  );
};

export default PlanetDetails;
