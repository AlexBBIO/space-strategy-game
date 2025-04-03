import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Game } from "./Game";
import { Planet } from "./Planet";

@Entity()
export class PhaseLane {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Planet)
  @JoinColumn({ name: "planetId1" })
  planet1: Planet;

  @Column()
  planetId1: string;

  @ManyToOne(() => Planet)
  @JoinColumn({ name: "planetId2" })
  planet2: Planet;

  @Column()
  planetId2: string;

  @Column("float")
  distance: number;

  @ManyToOne(() => Game, game => game.phaseLines)
  @JoinColumn({ name: "gameId" })
  game: Game;

  @Column()
  gameId: string;
}
