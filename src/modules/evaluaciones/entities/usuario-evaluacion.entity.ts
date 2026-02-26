import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Evaluacion } from './evaluacion.entity';
import { Curso } from '../../cursos/entities/curso.entity';

@Entity('usuario_evaluacion')
//@Unique(['usuario', 'evaluacion']) // Usar nombres de propiedades, no columnas
export class UsuarioEvaluacion {
  @PrimaryGeneratedColumn()
  id_usuario_evaluacion!: number;

  @Column({ default: 1 })
  numero_intento_actual!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0.0 })
  calificacion!: number;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @ManyToOne(() => Curso, { nullable: true })
  @JoinColumn({ name: 'id_curso' })
  curso!: Curso | null;

  @ManyToOne(() => Evaluacion, { eager: false })
  @JoinColumn({ name: 'id_evaluacion' })
  evaluacion!: Evaluacion;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_calificacion' })
  fecha_calificacion!: Date;
}
