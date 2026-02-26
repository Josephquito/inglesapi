import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Evaluacion } from '../../evaluaciones/entities/evaluacion.entity';
import { TipoPregunta } from './tipo-pregunta.entity';
import { Pregunta } from './pregunta.entity';

@Entity('bloques_pregunta')
export class BloquePregunta {
  @PrimaryGeneratedColumn({ name: 'id_bloque' })
  id_bloque: number;

  @ManyToOne(() => Evaluacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_evaluacion' })
  evaluacion: Evaluacion;

  @ManyToOne(() => TipoPregunta, (t) => t.bloques)
  @JoinColumn({ name: 'id_tipo_pregunta' })
  tipo: TipoPregunta; // LISTENING o READING

  @Column({ type: 'text' })
  enunciado: string;

  @Column({ type: 'text', nullable: true })
  texto_base: string | null; // READING

  @Column({ type: 'text', nullable: true })
  url_audio: string | null; // LISTENING

  @OneToMany(() => Pregunta, (p) => p.bloque, {
    cascade: ['insert', 'update', 'remove'],
  })
  preguntas: Pregunta[];
}
