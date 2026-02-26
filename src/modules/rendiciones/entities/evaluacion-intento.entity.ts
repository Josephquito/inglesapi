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
import { Evaluacion } from '../../evaluaciones/entities/evaluacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum IntentoEstado {
  EN_PROGRESO = 'EN_PROGRESO',
  ENTREGADO = 'ENTREGADO',
  EXPIRADO = 'EXPIRADO',
  SUSPENDIDO = 'SUSPENDIDO',
}

@Entity('evaluacion_intentos')
@Index(['evaluacion', 'estudiante', 'numero_intento'], { unique: true })
export class EvaluacionIntento {
  @PrimaryGeneratedColumn({ name: 'id_intento' })
  id_intento: number;

  @ManyToOne(() => Evaluacion, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'id_evaluacion' })
  evaluacion: Evaluacion;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_estudiante' })
  estudiante: Usuario;

  @Column({ type: 'int', default: 1 })
  numero_intento: number;

  @Column({ type: 'varchar', length: 20, default: IntentoEstado.EN_PROGRESO })
  estado: IntentoEstado;

  @CreateDateColumn({ type: 'timestamp' })
  inicio: Date;

  @Column({ type: 'timestamp', nullable: true })
  fin_programado: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fin_real: Date | null;

  // =============================
  // RESULTADO
  // =============================

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  puntaje_total: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  calificacion: number;

  @Column({ default: false })
  pendiente_revision: boolean;

  // =============================
  // ✅ PROCTORING / FRAUDE
  // =============================

  @Column({ default: false })
  proctoring_iniciado: boolean;

  // ✅ tu service usa "proctoring_iniciado_at"
  @Column({ type: 'timestamp', nullable: true })
  proctoring_iniciado_at: Date | null;

  // (opcional) si tú quieres conservar el nombre anterior, déjalo también:
  // OJO: tener ambos implica que tu service debe actualizar el correcto.
  // Si no lo usas, puedes borrarlo.
  @Column({ type: 'timestamp', nullable: true })
  proctoring_inicio_at: Date | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  proctoring_video_url: string | null;

  @Column({ type: 'int', default: 0 })
  fraude_warnings: number;

  // ✅ tu service usaba "suspendido" -> lo agregamos para compatibilidad
  @Column({ default: false })
  suspendido: boolean;

  // ✅ el campo “bueno” (si lo quieres mantener)
  @Column({ default: false })
  suspendido_por_fraude: boolean;

  // ✅ tu service usaba "motivo_suspension"
  @Column({ type: 'varchar', length: 60, nullable: true })
  motivo_suspension: string | null;

  // ✅ tu service usaba "suspendido_at"
  @Column({ type: 'timestamp', nullable: true })
  suspendido_at: Date | null;

  // ✅ el campo “bueno” (si lo quieres mantener)
  @Column({ type: 'varchar', length: 40, nullable: true })
  ultimo_motivo_fraude: string | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
