import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entidad } from '../../entidades/entities/entidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Curso } from '../../cursos/entities/curso.entity';

@Entity('evaluaciones')
export class Evaluacion {
  @PrimaryGeneratedColumn()
  id_evaluacion!: number;

  @Column()
  titulo!: string;

  @Column({ length: 500 })
  descripcion!: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_inicio!: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin!: Date | null;

  @Column({ default: false })
  es_calificada!: boolean;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0.0 })
  calificacion!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0.0 })
  calificacion_requerida!: number;

  @Column({ default: false })
  tiene_intentos!: boolean;

  @Column({ default: 1 })
  intentos!: number;

  @Column({ default: 0 })
  numero_a_mostrar!: number;

  @Column({ default: false })
  tiene_tiempo!: boolean;

  @Column({ default: 0 })
  minutos!: number;

  @Column({ default: false })
  valida_fraude!: boolean;

  @Column({ default: false })
  usa_camara!: boolean;

  @Column({ default: false })
  activa!: boolean;

  // ✅ BLINDADO
  @ManyToOne(() => Curso, { nullable: false })
  @JoinColumn({ name: 'id_curso', referencedColumnName: 'id_curso' })
  curso!: Curso;

  @ManyToOne(() => Entidad, { nullable: false })
  @JoinColumn({ name: 'id_entidad', referencedColumnName: 'id_entidad' })
  entidad!: Entidad;

  // ⚠️ Aquí te recomiendo NO usar "id_usuario" porque se presta a confusión:
  // pero si tu tabla realmente se llama id_usuario, OK.
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id_usuario' })
  creador!: Usuario;
}
