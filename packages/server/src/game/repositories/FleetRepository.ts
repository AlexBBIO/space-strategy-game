import { DataSource, Repository } from 'typeorm';
import { Fleet } from '../../database/entities';
import { logger } from '../../utils/logger';

export class FleetRepository {
  private repository: Repository<Fleet>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Fleet);
  }

  async findById(id: string): Promise<Fleet | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['owner', 'originPlanet', 'destinationPlanet']
      });
    } catch (error) {
      logger.error(`Error finding fleet by ID ${id}:`, error);
      return null;
    }
  }

  async findByGameId(gameId: string): Promise<Fleet[]> {
    try {
      return await this.repository.find({
        where: { gameId },
        relations: ['owner', 'originPlanet', 'destinationPlanet']
      });
    } catch (error) {
      logger.error(`Error finding fleets by game ID ${gameId}:`, error);
      return [];
    }
  }

  async findByOwnerId(ownerId: string, gameId: string): Promise<Fleet[]> {
    try {
      return await this.repository.find({
        where: { ownerId, gameId },
        relations: ['owner', 'originPlanet', 'destinationPlanet']
      });
    } catch (error) {
      logger.error(`Error finding fleets by owner ID ${ownerId}:`, error);
      return [];
    }
  }

  async findByPosition(x: number, y: number, gameId: string): Promise<Fleet[]> {
    try {
      // This is a simplification - in a real implementation, you might need
      // to use a more sophisticated approach to find fleets at a specific position
      const fleets = await this.repository.find({
        where: { gameId },
        relations: ['owner']
      });
      
      // Filter fleets at the specified position
      // For simplicity, using exact position match - in production,
      // you might want to use a proximity threshold
      return fleets.filter(fleet => 
        Math.abs(fleet.x - x) < 0.1 && Math.abs(fleet.y - y) < 0.1
      );
    } catch (error) {
      logger.error(`Error finding fleets at position (${x}, ${y}):`, error);
      return [];
    }
  }

  async save(fleet: Fleet): Promise<Fleet> {
    try {
      return await this.repository.save(fleet);
    } catch (error) {
      logger.error(`Error saving fleet ${fleet.id}:`, error);
      throw error;
    }
  }

  async remove(fleet: Fleet): Promise<void> {
    try {
      await this.repository.remove(fleet);
    } catch (error) {
      logger.error(`Error removing fleet ${fleet.id}:`, error);
      throw error;
    }
  }
}
