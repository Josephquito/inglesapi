import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Estado } from '../../../entities/estado.entity';
import { Rol } from '../../roles/entities/rol.entity';

@Entity('curso_usuario')
export class CursoUsuario {
  @PrimaryGeneratedColumn()
  @JoinColumn({ name: 'id_usuario_curso' })
  id_usuario_curso!: number;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'id_curso' })
  curso!: Curso;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'id_rol' })
  rol!: Rol;

  @ManyToOne(() => Estado)
  @JoinColumn({ name: 'id_estado' })
  estado!: Estado;
}
