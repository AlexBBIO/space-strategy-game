import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Fleet } from "./Fleet";
import { Game } from "./Game";

@Entity()
export class Player {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @OneToMany(() => Fleet, fleet => fleet.owner)
  fleets: Fleet[];

  @OneToMany(() => Game, game => game.host)
  hostedGames: Game[];
}
