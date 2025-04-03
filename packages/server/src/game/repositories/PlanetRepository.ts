import { DataSource, Repository } from 'typeorm';
import { Planet } from '../../database/entities';
import { logger } from '../../utils/logger';

export class PlanetRepository {
  private repository: Repository<Planet>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Planet);
  }

  async findById(id: string): Promise<Planet | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['owner']
      });
    } catch (error) {
      logger.error(`Error finding planet by ID ${id}:`, error);
      return null;
    }
  }

  async findByGameId(gameId: string): Promise<Planet[]> {
    try {
      return await this.repository.find({
        where: { gameId },
        relations: ['owner']
      });
    } catch (error) {
      logger.error(`Error finding planets by game ID ${gameId}:`, error);
      return [];
    }
  }

  async findByOwnerId(ownerId: string, gameId: string): Promise<Planet[]> {
    try {
      return await this.repository.find({
        where: { ownerId, gameId },
        relations: ['owner']
      });
    } catch (error) {
      logger.error(`Error finding planets by owner ID ${ownerId}:`, error);
      return [];
    }
  }

  async save(planet: Planet): Promise<Planet> {
    try {
      return await this.repository.save(planet);
    } catch (error) {
      logger.error(`Error saving planet ${planet.id}:`, error);
      throw error;
    }
  }

  async remove(planet: Planet): Promise<void> {
    try {
      await this.repository.remove(planet);
    } catch (error) {
      logger.error(`Error removing planet ${planet.id}:`, error);
      throw error;
    }
  }
}
