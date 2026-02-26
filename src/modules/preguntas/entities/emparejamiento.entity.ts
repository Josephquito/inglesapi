import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity('emparejamientos')
export class Emparejamiento {
  @PrimaryGeneratedColumn({ name: 'id_emparejamiento' })
  id_emparejamiento: number;

  @Column({ type: 'text' })
  izquierda: string;

  @Column({ type: 'text' })
  derecha: string;

  @ManyToOne(() => Pregunta, (p) => p.emparejamientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pregunta' })
  pregunta: Pregunta;
}
