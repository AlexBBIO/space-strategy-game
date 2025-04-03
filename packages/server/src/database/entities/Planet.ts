import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Player } from "./Player";
import { Game } from "./Game";

@Entity()
export class Planet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column("float")
  x: number;

  @Column("float")
  y: number;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: "ownerId" })
  owner: Player | null;

  @Column({ nullable: true })
  ownerId: string | null;

  @Column("float")
  population: number;

  @Column("float")
  maxPopulation: number;

  @Column("float")
  populationGrowthRate: number;

  @Column()
  hasShipyard: boolean;

  @ManyToOne(() => Game, game => game.planets)
  @JoinColumn({ name: "gameId" })
  game: Game;

  @Column()
  gameId: string;
}
