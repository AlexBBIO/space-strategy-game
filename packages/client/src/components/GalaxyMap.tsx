import { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Planet, Fleet, PhaseLane, Player, Position } from '@space-strategy-game/shared';

interface GalaxyMapProps {
  planets: Planet[];
  phaseLines: PhaseLane[];
  fleets: Fleet[];
  currentPlayer: Player | null;
  selectedPlanet: Planet | null;
  selectedFleet: Fleet | null;
  onPlanetClick: (planet: Planet) => void;
  onFleetClick: (fleet: Fleet) => void;
}

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-background);
  background-image: 
    radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 4px),
    radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px);
  background-size: 100px 100px, 50px 50px;
  background-position: 0 0, 25px 25px;
`;

const MapCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const ControlsOverlay = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 2;
`;

const ZoomButton = styled.button`
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PlanetElement = styled.div<{ x: number; y: number; size: number; color: string; selected: boolean }>`
  position: absolute;
  left: ${props => props.x - props.size / 2}px;
  top: ${props => props.y - props.size / 2}px;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  background-color: ${props => props.color};
  box-shadow: 0 0 10px ${props => props.color};
  border: ${props => props.selected ? '2px solid white' : 'none'};
  cursor: pointer;
  z-index: 2;
  
  &:hover {
    transform: scale(1.1);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%);
  }
`;

const PlanetLabel = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y + 12}px;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: white;
  text-shadow: 0 0 4px black;
  pointer-events: none;
  z-index: 2;
`;

const FleetElement = styled.div<{ x: number; y: number; size: number; color: string; selected: boolean }>`
  position: absolute;
  left: ${props => props.x - props.size / 2}px;
  top: ${props => props.y - props.size / 2}px;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background-color: ${props => props.color};
  box-shadow: 0 0 5px ${props => props.color};
  border: ${props => props.selected ? '2px solid white' : 'none'};
  cursor: pointer;
  z-index: 3;
  transform: rotate(180deg);
  
  &:hover {
    transform: rotate(180deg) scale(1.1);
  }
`;

const GalaxyMap = ({
  planets,
  phaseLines,
  fleets,
  currentPlayer,
  selectedPlanet,
  selectedFleet,
  onPlanetClick,
  onFleetClick
}: GalaxyMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  
  // Set neutral planet color
  const neutralPlanetColor = '#808080';
  
  // Calculate map dimensions based on planets
  useEffect(() => {
    if (planets.length === 0) return;
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    planets.forEach(planet => {
      minX = Math.min(minX, planet.position.x);
      maxX = Math.max(maxX, planet.position.x);
      minY = Math.min(minY, planet.position.y);
      maxY = Math.max(maxY, planet.position.y);
    });
    
    // Add padding
    minX -= 100;
    maxX += 100;
    minY -= 100;
    maxY += 100;
    
    setDimensions({
      width: maxX - minX,
      height: maxY - minY
    });
    
    // Center the view
    if (containerRef.current) {
      setPan({
        x: containerRef.current.clientWidth / 2 - (minX + maxX) / 2,
        y: containerRef.current.clientHeight / 2 - (minY + maxY) / 2
      });
    }
  }, [planets]);
  
  // Draw phase lanes
  useEffect(() => {
    if (!canvasRef.current || planets.length === 0 || phaseLines.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = containerRef.current?.clientWidth || 0;
    canvas.height = containerRef.current?.clientHeight || 0;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw phase lanes
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'var(--color-phase-lane)';
    
    phaseLines.forEach(lane => {
      const planet1 = planets.find(p => p.id === lane.planetId1);
      const planet2 = planets.find(p => p.id === lane.planetId2);
      
      if (planet1 && planet2) {
        const start = transformPoint(planet1.position);
        const end = transformPoint(planet2.position);
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw distance indicator in the middle
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px var(--font-main)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lane.distance.toFixed(0), midX, midY);
      }
    });
    
    // Draw fleet movement paths
    ctx.setLineDash([5, 3]);
    
    fleets.forEach(fleet => {
      if (fleet.moving && fleet.originPlanetId && fleet.destinationPlanetId) {
        const originPlanet = planets.find(p => p.id === fleet.originPlanetId);
        const destPlanet = planets.find(p => p.id === fleet.destinationPlanetId);
        
        if (originPlanet && destPlanet) {
          const start = transformPoint(originPlanet.position);
          const end = transformPoint(destPlanet.position);
          
          ctx.strokeStyle = fleet.owner.color;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }
    });
    
    ctx.setLineDash([]);
  }, [planets, phaseLines, fleets, zoom, pan, dimensions]);
  
  // Transform a coordinate from game space to screen space
  const transformPoint = (point: Position): Position => {
    return {
      x: point.x * zoom + pan.x,
      y: point.y * zoom + pan.y
    };
  };
  
  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPan(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.2));
  };
  
  // Handle planet click
  const handlePlanetClick = (planet: Planet) => {
    onPlanetClick(planet);
  };
  
  // Handle fleet click
  const handleFleetClick = (fleet: Fleet) => {
    onFleetClick(fleet);
  };
  
  // Get planet color based on owner
  const getPlanetColor = (planet: Planet) => {
    if (!planet.owner) return neutralPlanetColor;
    return planet.owner.color;
  };
  
  // Get fleet color based on owner
  const getFleetColor = (fleet: Fleet) => {
    return fleet.owner.color;
  };
  
  // Calculate planet size based on population
  const getPlanetSize = (planet: Planet) => {
    return 20 + (planet.population / planet.maxPopulation) * 20;
  };
  
  // Calculate fleet size based on strength
  const getFleetSize = (fleet: Fleet) => {
    return 15 + Math.min(fleet.strength / 100, 1) * 20;
  };
  
  return (
    <MapContainer
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <MapCanvas ref={canvasRef} />
      
      {planets.map(planet => {
        const pos = transformPoint(planet.position);
        const size = getPlanetSize(planet);
        const color = getPlanetColor(planet);
        const isSelected = selectedPlanet?.id === planet.id;
        
        return (
          <div key={planet.id}>
            <PlanetElement
              x={pos.x}
              y={pos.y}
              size={size}
              color={color}
              selected={isSelected}
              onClick={() => handlePlanetClick(planet)}
            />
            <PlanetLabel x={pos.x} y={pos.y}>
              {planet.name}
            </PlanetLabel>
          </div>
        );
      })}
      
      {fleets.map(fleet => {
        const pos = transformPoint(fleet.position);
        const size = getFleetSize(fleet);
        const color = getFleetColor(fleet);
        const isSelected = selectedFleet?.id === fleet.id;
        
        return (
          <FleetElement
            key={fleet.id}
            x={pos.x}
            y={pos.y}
            size={size}
            color={color}
            selected={isSelected}
            onClick={() => handleFleetClick(fleet)}
          />
        );
      })}
      
      <ControlsOverlay>
        <ZoomButton onClick={handleZoomIn}>+</ZoomButton>
        <ZoomButton onClick={handleZoomOut}>-</ZoomButton>
      </ControlsOverlay>
    </MapContainer>
  );
};

export default GalaxyMap;
