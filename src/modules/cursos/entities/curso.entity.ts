import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entidad } from '../../entidades/entities/entidad.entity';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn()
  id_curso!: number;

  @Column()
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_inicio!: Date;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_fin!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro!: Date;

  @Column({ default: true })
  activo!: boolean;

  @ManyToOne(() => Entidad)
  @JoinColumn({ name: 'id_entidad' })
  entidad!: Entidad;
}
