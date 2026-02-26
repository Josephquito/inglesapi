import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entidad } from '../../entidades/entities/entidad.entity';
import { Rol } from '../../roles/entities/rol.entity';
import { Estado } from '../../../entities/estado.entity';

@Entity('usuarios')
//@Unique(['identificacion', 'id_entidad'])
export class Usuario {
  @PrimaryGeneratedColumn()
  id_usuario!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  identificacion!: string;

  @Column()
  nombres!: string;

  @Column()
  apellidos!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro!: Date;

  @ManyToOne(() => Entidad)
  @JoinColumn({ name: 'id_entidad' })
  entidad!: Entidad;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'id_rol' })
  rol!: Rol;

  @ManyToOne(() => Estado)
  @JoinColumn({ name: 'id_estado' })
  estado!: Estado;
}
