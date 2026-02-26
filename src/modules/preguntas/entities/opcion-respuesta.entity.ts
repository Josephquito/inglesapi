import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity('opciones_respuesta')
export class OpcionRespuesta {
  @PrimaryGeneratedColumn({ name: 'id_opcion' })
  id_opcion: number;

  @Column({ type: 'text' })
  texto: string;

  @Column({ default: false })
  es_correcta: boolean;

  @ManyToOne(() => Pregunta, (p) => p.opcionesRespuesta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_pregunta' })
  pregunta: Pregunta;
}
