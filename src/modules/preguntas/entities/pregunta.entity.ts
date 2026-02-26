import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
} from 'typeorm';

import { Evaluacion } from '../../evaluaciones/entities/evaluacion.entity';
import { TipoPregunta } from './tipo-pregunta.entity';
import { BloquePregunta } from './bloque-pregunta.entity';
import { OpcionRespuesta } from './opcion-respuesta.entity';
import { Emparejamiento } from './emparejamiento.entity';

// Evita incoherencia: debe pertenecer a evaluación o a bloque (pero no ambos)
@Check(
  `("id_evaluacion" IS NOT NULL AND "id_bloque" IS NULL) OR ("id_evaluacion" IS NULL AND "id_bloque" IS NOT NULL)`,
)
@Entity('preguntas')
export class Pregunta {
  @PrimaryGeneratedColumn({ name: 'id_pregunta' })
  id_pregunta: number;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'numeric', default: 1 })
  puntaje: number;

  @Column({ type: 'text', nullable: true })
  url_multimedia: string | null;

  // WRITING opcional
  @Column({ type: 'text', nullable: true })
  respuesta_esperada: string | null;

  @Column({ default: false })
  auto_calificable: boolean;

  @ManyToOne(() => TipoPregunta, (t) => t.preguntas)
  @JoinColumn({ name: 'id_tipo_pregunta' })
  tipo: TipoPregunta;

  // pregunta suelta
  @ManyToOne(() => Evaluacion, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'id_evaluacion' })
  evaluacion: Evaluacion | null;

  // subpregunta
  @ManyToOne(() => BloquePregunta, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'id_bloque' })
  bloque: BloquePregunta | null;

  @OneToMany(() => OpcionRespuesta, (o) => o.pregunta, {
    cascade: ['insert', 'update', 'remove'],
  })
  opcionesRespuesta: OpcionRespuesta[];

  @OneToMany(() => Emparejamiento, (e) => e.pregunta, {
    cascade: ['insert', 'update', 'remove'],
  })
  emparejamientos: Emparejamiento[];
}
