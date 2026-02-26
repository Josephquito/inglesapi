import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EvaluacionIntento } from './evaluacion-intento.entity';
import { Pregunta } from '../../preguntas/entities/pregunta.entity';
import { OpcionRespuesta } from '../../preguntas/entities/opcion-respuesta.entity';

@Entity('intento_respuestas')
@Index(['intento', 'pregunta'], { unique: true })
export class RespuestaIntento {
  @PrimaryGeneratedColumn({ name: 'id_respuesta' })
  id_respuesta: number;

  @ManyToOne(() => EvaluacionIntento, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'id_intento' })
  intento: EvaluacionIntento;

  @ManyToOne(() => Pregunta, { nullable: false })
  @JoinColumn({ name: 'id_pregunta' })
  pregunta: Pregunta;

  // WRITING
  @Column({ type: 'text', nullable: true })
  respuesta_texto: string | null;

  // MULTIPLE_CHOICE
  @ManyToOne(() => OpcionRespuesta, { nullable: true })
  @JoinColumn({ name: 'id_opcion' })
  opcion_seleccionada: OpcionRespuesta | null;

  // MATCHING (guardar pares seleccionados)
  // Ejemplo: [{ izquierda: "A", derecha: "1" }, ...]
  @Column({ type: 'json', nullable: true })
  respuesta_matching: any | null;

  // SPEAKING (si guardas url del audio)
  @Column({ type: 'text', nullable: true })
  url_audio: string | null;

  // Calificación por pregunta
  @Column({ default: false })
  auto_calificada: boolean;

  @Column({ default: false })
  es_correcta: boolean;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  puntaje_obtenido: number;

  @Column({ default: false })
  revisada: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
