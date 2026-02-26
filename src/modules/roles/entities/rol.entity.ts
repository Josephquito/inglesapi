import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id_rol!: number;

  @Column({ length: 20, unique: true })
  codigo!: string; // ADMIN | DOCENTE | ESTUDIANTE

  @Column({ length: 50 })
  nombre!: string;

  @Column({ default: true })
  activo!: boolean;
}
