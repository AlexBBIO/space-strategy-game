import { useState } from 'react';
import styled from 'styled-components';
import { Fleet, Planet, PhaseLane } from '@space-strategy-game/shared';

interface FleetControlsProps {
  fleet: Fleet;
  planets: Planet[];
  phaseLines: PhaseLane[];
  canGiveOrders: boolean;
  onMoveFleet: (fleet: Fleet, destinationPlanet: Planet) => void;
  onSplitFleet: (fleet: Fleet, percentage: number) => void;
}

const Container = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FleetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FleetIcon = styled.div<{ color: string }>`
  width: 30px;
  height: 30px;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background-color: ${props => props.color};
  transform: rotate(180deg);
`;

const FleetInfo = styled.div`
  flex: 1;
`;

const FleetName = styled.h2`
  margin: 0;
  font-size: 1.25rem;
`;

const FleetStatus = styled.p<{ moving: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  color: ${props => props.moving ? 'var(--color-warning)' : 'var(--color-success)'};
`;

const FleetStats = styled.div`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.span`
  color: var(--color-text-secondary);
`;

const StatValue = styled.span`
  font-weight: 500;
`;

const SectionTitle = styled.h3`
  margin: 0.5rem 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
`;

const DestinationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
`;

const DestinationItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(92, 76, 229, 0.1);
  }
`;

const PlanetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlanetIcon = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const PlanetName = styled.span`
  font-size: 0.875rem;
`;

const DistanceValue = styled.span`
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem;
  background-color: ${props => {
    switch (props.variant) {
      case 'primary': return 'var(--color-primary)';
      case 'secondary': return 'var(--color-neutral)';
      case 'danger': return 'var(--color-danger)';
      default: return 'var(--color-primary)';
    }
  }};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => {
      switch (props.variant) {
        case 'primary': return 'var(--color-primary-light)';
        case 'secondary': return '#8f8ea6';
        case 'danger': return '#ff7a93';
        default: return 'var(--color-primary-light)';
      }
    }};
  }
  
  &:disabled {
    background-color: var(--color-neutral);
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SplitControls = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SplitSlider = styled.input`
  flex: 1;
`;

const SplitValue = styled.span`
  width: 40px;
  text-align: right;
`;

const FleetControls = ({
  fleet,
  planets,
  phaseLines,
  canGiveOrders,
  onMoveFleet,
  onSplitFleet
}: FleetControlsProps) => {
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitPercentage, setSplitPercentage] = useState(50);
  
  // Find the current location of the fleet
  const currentPlanet = !fleet.moving && fleet.originPlanetId 
    ? planets.find(p => p.id === fleet.originPlanetId) 
    : null;
  
  // Find the destination of the fleet (if moving)
  const destinationPlanet = fleet.moving && fleet.destinationPlanetId 
    ? planets.find(p => p.id === fleet.destinationPlanetId) 
    : null;
  
  // Get available destinations for the fleet
  const getAvailableDestinations = () => {
    if (!currentPlanet) return [];
    
    // Find all phase lanes connected to the current planet
    const connectedLanes = phaseLines.filter(lane => 
      lane.planetId1 === currentPlanet.id || lane.planetId2 === currentPlanet.id
    );
    
    // Get the connected planets
    return connectedLanes.map(lane => {
      const destId = lane.planetId1 === currentPlanet.id ? lane.planetId2 : lane.planetId1;
      const destPlanet = planets.find(p => p.id === destId);
      
      return { 
        planet: destPlanet, 
        distance: lane.distance 
      };
    }).filter(item => item.planet !== undefined) as { planet: Planet; distance: number }[];
  };
  
  const availableDestinations = getAvailableDestinations();
  
  // Handle fleet movement
  const handleMove = (destination: Planet) => {
    if (canGiveOrders && !fleet.moving) {
      onMoveFleet(fleet, destination);
    }
  };
  
  // Handle fleet splitting
  const handleSplit = () => {
    if (canGiveOrders && !fleet.moving) {
      onSplitFleet(fleet, splitPercentage);
      setIsSplitting(false);
    }
  };
  
  // Get planet color based on owner
  const getPlanetColor = (planet: Planet) => {
    if (!planet.owner) return '#808080'; // Neutral
    return planet.owner.color;
  };
  
  return (
    <Container>
      <FleetHeader>
        <FleetIcon color={fleet.owner.color} />
        <FleetInfo>
          <FleetName>{fleet.owner.name}'s Fleet</FleetName>
          <FleetStatus moving={fleet.moving}>
            {fleet.moving 
              ? `En route to ${destinationPlanet?.name || 'destination'} (${Math.floor(fleet.travelProgress * 100)}%)`
              : `Stationed at ${currentPlanet?.name || 'unknown location'}`
            }
          </FleetStatus>
        </FleetInfo>
      </FleetHeader>
      
      <FleetStats>
        <StatRow>
          <StatLabel>Strength</StatLabel>
          <StatValue>{Math.floor(fleet.strength)}</StatValue>
        </StatRow>
      </FleetStats>
      
      {canGiveOrders && !fleet.moving && (
        <>
          <SectionTitle>Available Destinations</SectionTitle>
          {availableDestinations.length > 0 ? (
            <DestinationList>
              {availableDestinations.map(({ planet, distance }) => (
                <DestinationItem key={planet.id} onClick={() => handleMove(planet)}>
                  <PlanetInfo>
                    <PlanetIcon color={getPlanetColor(planet)} />
                    <PlanetName>{planet.name}</PlanetName>
                  </PlanetInfo>
                  <DistanceValue>{distance.toFixed(0)} units</DistanceValue>
                </DestinationItem>
              ))}
            </DestinationList>
          ) : (
            <p>No available destinations from this location.</p>
          )}
          
          <ActionButtons>
            {isSplitting ? (
              <>
                <SplitControls>
                  <SplitSlider 
                    type="range" 
                    min="10" 
                    max="90" 
                    value={splitPercentage} 
                    onChange={(e) => setSplitPercentage(parseInt(e.target.value))}
                  />
                  <SplitValue>{splitPercentage}%</SplitValue>
                </SplitControls>
                <Button onClick={handleSplit}>
                  Split Fleet ({splitPercentage}%)
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setIsSplitting(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setIsSplitting(true)}
                disabled={fleet.strength < 20} // Minimum fleet strength required to split
              >
                Split Fleet
              </Button>
            )}
          </ActionButtons>
        </>
      )}
      
      {!canGiveOrders && (
        <p>You cannot give orders to this fleet.</p>
      )}
      
      {fleet.moving && (
        <p>Fleet is currently in transit and cannot receive new orders.</p>
      )}
    </Container>
  );
};

export default FleetControls;
