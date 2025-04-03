import { DataSource, Repository } from 'typeorm';
import { Game } from '../../database/entities';
import { logger } from '../../utils/logger';

export class GameRepository {
  private repository: Repository<Game>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Game);
  }

  async findById(id: string): Promise<Game | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['host']
      });
    } catch (error) {
      logger.error(`Error finding game by ID ${id}:`, error);
      return null;
    }
  }

  async findByStatus(status: 'waiting' | 'starting' | 'in_progress' | 'finished'): Promise<Game[]> {
    try {
      return await this.repository.find({
        where: { status },
        relations: ['host']
      });
    } catch (error) {
      logger.error(`Error finding games by status ${status}:`, error);
      return [];
    }
  }

  async findAll(): Promise<Game[]> {
    try {
      return await this.repository.find({
        relations: ['host']
      });
    } catch (error) {
      logger.error('Error finding all games:', error);
      return [];
    }
  }

  async save(game: Game): Promise<Game> {
    try {
      return await this.repository.save(game);
    } catch (error) {
      logger.error(`Error saving game ${game.id}:`, error);
      throw error;
    }
  }

  async remove(game: Game): Promise<void> {
    try {
      await this.repository.remove(game);
    } catch (error) {
      logger.error(`Error removing game ${game.id}:`, error);
      throw error;
    }
  }
}
