import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from "typeorm";
import { Player } from "./Player";
import { Planet } from "./Planet";
import { PhaseLane } from "./PhaseLane";
import { Fleet } from "./Fleet";

@Entity()
export class Game {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Player, player => player.hostedGames)
  @JoinColumn({ name: "hostId" })
  host: Player;

  @Column()
  hostId: string;

  @Column()
  maxPlayers: number;

  @Column({
    type: "enum",
    enum: ["waiting", "starting", "in_progress", "finished"],
    default: "waiting"
  })
  status: "waiting" | "starting" | "in_progress" | "finished";

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  lastTickTimestamp: number;

  @OneToMany(() => Planet, planet => planet.game, { cascade: true })
  planets: Planet[];

  @OneToMany(() => PhaseLane, phaseLane => phaseLane.game, { cascade: true })
  phaseLines: PhaseLane[];

  @OneToMany(() => Fleet, fleet => fleet.game, { cascade: true })
  fleets: Fleet[];

  // Relation table for players in the game
  @Column("simple-array")
  playerIds: string[];
}
