import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Player } from "./Player";
import { Planet } from "./Planet";
import { Game } from "./Game";

@Entity()
export class Fleet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "ownerId" })
  owner: Player;

  @Column()
  ownerId: string;

  @Column("float")
  x: number;

  @Column("float")
  y: number;

  @Column("float")
  strength: number;

  @ManyToOne(() => Planet, { nullable: true })
  @JoinColumn({ name: "originPlanetId" })
  originPlanet: Planet | null;

  @Column({ nullable: true })
  originPlanetId: string | null;

  @ManyToOne(() => Planet, { nullable: true })
  @JoinColumn({ name: "destinationPlanetId" })
  destinationPlanet: Planet | null;

  @Column({ nullable: true })
  destinationPlanetId: string | null;

  @Column("float")
  travelProgress: number;

  @Column()
  moving: boolean;

  @ManyToOne(() => Game, game => game.fleets)
  @JoinColumn({ name: "gameId" })
  game: Game;

  @Column()
  gameId: string;
}
