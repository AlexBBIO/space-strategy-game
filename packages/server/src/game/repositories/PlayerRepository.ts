import { DataSource, In, Repository } from 'typeorm';
import { Player } from '../../database/entities';
import { logger } from '../../utils/logger';

export class PlayerRepository {
  private repository: Repository<Player>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Player);
  }

  async findById(id: string): Promise<Player | null> {
    try {
      return await this.repository.findOne({
        where: { id }
      });
    } catch (error) {
      logger.error(`Error finding player by ID ${id}:`, error);
      return null;
    }
  }

  async findByIds(ids: string[]): Promise<Player[]> {
    try {
      if (ids.length === 0) return [];
      return await this.repository.find({
        where: { id: In(ids) }
      });
    } catch (error) {
      logger.error(`Error finding players by IDs:`, error);
      return [];
    }
  }

  async findByName(name: string): Promise<Player | null> {
    try {
      return await this.repository.findOne({
        where: { name }
      });
    } catch (error) {
      logger.error(`Error finding player by name ${name}:`, error);
      return null;
    }
  }

  async createPlayer(name: string, color: string): Promise<Player> {
    try {
      const player = new Player();
      player.name = name;
      player.color = color;
      return await this.repository.save(player);
    } catch (error) {
      logger.error(`Error creating player ${name}:`, error);
      throw error;
    }
  }

  async save(player: Player): Promise<Player> {
    try {
      return await this.repository.save(player);
    } catch (error) {
      logger.error(`Error saving player ${player.id}:`, error);
      throw error;
    }
  }

  async remove(player: Player): Promise<void> {
    try {
      await this.repository.remove(player);
    } catch (error) {
      logger.error(`Error removing player ${player.id}:`, error);
      throw error;
    }
  }
}
