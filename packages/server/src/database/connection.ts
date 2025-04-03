import { DataSource } from 'typeorm';
import { Player, Game, Planet, PhaseLane, Fleet } from './entities';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'space_game',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [Player, Game, Planet, PhaseLane, Fleet],
  subscribers: [],
  migrations: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Error initializing database connection:', error);
    throw error;
  }
};
