import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CrearCursoDto } from 'src/modules/cursos/dto/crear-curso.dto';
import { AsignarUsuariosDto } from 'src/modules/entidades/dto/asignar-usuarios.dto';

import { CursoUsuario } from 'src/modules/cursos/entities/curso-usuario.entity';
import { Curso } from './entities/curso.entity';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';
import { Estado } from 'src/entities/estado.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';

@Injectable()
export class CursoService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,
    @InjectRepository(Entidad)
    private readonly entidadRepo: Repository<Entidad>,
    @InjectRepository(Estado)
    private readonly estadoRepo: Repository<Estado>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  private normalizeRol(rol: any): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  async listarCursosPorRol(user: any) {
    const r = this.normalizeRol(user.rol);
    const id_usuario = user.id_usuario;

    if (r === 'ADMIN') {
      const cursos = await this.cursoRepo.find({
        where: { activo: true },
        relations: ['entidad'],
        order: { fecha_inicio: 'DESC' },
      });

      return cursos.map((curso) => ({
        ...curso,
        rol: { nombre: 'Administrador' },
      }));
    }

    const cursosUsuario = await this.cursoUsuarioRepo.find({
      where: {
        usuario: { id_usuario },
        estado: { codigo: 'A' },
      },
      relations: ['curso', 'curso.entidad', 'rol'],
      order: { curso: { fecha_inicio: 'DESC' } },
    });

    const vistos = new Set<number>();

    return cursosUsuario
      .filter((cu) => {
        if (vistos.has(cu.curso.id_curso)) return false;
        vistos.add(cu.curso.id_curso);
        return true;
      })
      .map((cu) => ({
        id_curso: cu.curso.id_curso,
        nombre: cu.curso.nombre,
        descripcion: cu.curso.descripcion,
        fecha_inicio: cu.curso.fecha_inicio,
        fecha_fin: cu.curso.fecha_fin,
        fecha_registro: cu.curso.fecha_registro,
        activo: cu.curso.activo,
        entidad: cu.curso.entidad,
        rol: cu.rol ? { nombre: cu.rol.nombre } : null,
      }));
  }

  async obtenerPorId(id: number): Promise<Curso | null> {
    return this.cursoRepo.findOne({
      where: { id_curso: id },
      relations: ['entidad'],
    });
  }

  async crearCurso(dto: CrearCursoDto) {
    const entidad = await this.entidadRepo.findOneBy({
      id_entidad: dto.id_entidad,
    });
    if (!entidad) throw new NotFoundException('Entidad no encontrada');

    const curso = this.cursoRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      fecha_inicio: dto.fecha_inicio || new Date(),
      fecha_fin: dto.fecha_fin || new Date(),
      activo: true,
      entidad,
    });

    return this.cursoRepo.save(curso);
  }

  async actualizar(id: number, dto: CrearCursoDto): Promise<Curso> {
    const curso = await this.cursoRepo.findOneBy({ id_curso: id });
    if (!curso) throw new NotFoundException(`Curso con id ${id} no encontrado`);

    curso.nombre = dto.nombre ?? curso.nombre;
    curso.descripcion = dto.descripcion ?? curso.descripcion;
    curso.fecha_inicio = dto.fecha_inicio ?? curso.fecha_inicio;
    curso.fecha_fin = dto.fecha_fin ?? curso.fecha_fin;
    curso.activo = dto.activo ?? curso.activo;

    return this.cursoRepo.save(curso);
  }

  async asignarUsuarios(dto: AsignarUsuariosDto) {
    const estado = await this.estadoRepo.findOneBy({ codigo: 'A' });
    const curso = await this.cursoRepo.findOneBy({ id_curso: dto.id_curso });

    if (!curso || !estado)
      throw new NotFoundException('Curso o estado no encontrado');

    const registros = await Promise.all(
      dto.usuarios.map(async (id_usuario: number) => {
        const usuario = await this.usuarioRepo.findOne({
          where: { id_usuario },
          relations: ['rol'],
        });

        if (!usuario) throw new NotFoundException('Usuario no encontrado');
        if (!usuario.rol)
          throw new NotFoundException('Usuario sin rol asignado');

        const existe = await this.cursoUsuarioRepo.findOne({
          where: {
            curso: { id_curso: dto.id_curso },
            usuario: { id_usuario },
            estado: { codigo: 'A' },
          },
          relations: ['estado'],
        });

        if (existe) return existe;

        const asignacion = this.cursoUsuarioRepo.create({
          curso,
          usuario,
          rol: usuario.rol,
          estado,
        });

        return this.cursoUsuarioRepo.save(asignacion);
      }),
    );

    return registros;
  }

  async obtenerUsuariosAsignadosYDisponibles(id_curso: number): Promise<{
    asignados: {
      id_usuario: number;
      nombres: string;
      apellidos: string;
      rol: Rol;
    }[];
    disponibles: { id_usuario: number; nombres: string; apellidos: string }[];
  }> {
    const curso = await this.cursoRepo.findOne({
      where: { id_curso },
      relations: ['entidad'],
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const todosUsuarios = await this.usuarioRepo.find({
      where: { entidad: curso.entidad },
      relations: ['rol'],
    });

    const asignaciones = await this.cursoUsuarioRepo.find({
      where: { curso: { id_curso } },
      relations: ['usuario', 'rol'],
    });

    const asignados = asignaciones.map((cu) => ({
      id_usuario: cu.usuario.id_usuario,
      nombres: cu.usuario.nombres,
      apellidos: cu.usuario.apellidos,
      rol: cu.rol,
    }));

    const idsAsignados = new Set(asignados.map((a) => a.id_usuario));

    const disponibles = todosUsuarios
      .filter((u) => !idsAsignados.has(u.id_usuario))
      .map((u) => ({
        id_usuario: u.id_usuario,
        nombres: u.nombres,
        apellidos: u.apellidos,
      }));

    return { asignados, disponibles };
  }

  async obtenerUsuariosCurso(id_curso: number) {
    const curso = await this.cursoRepo.findOne({
      where: { id_curso },
      relations: ['entidad'],
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    if (!curso.entidad?.id_entidad)
      throw new NotFoundException('Curso sin entidad');

    // ✅ usuarios de la entidad (para asignar)
    const usuariosEntidad = await this.usuarioRepo.find({
      where: { entidad: { id_entidad: curso.entidad.id_entidad } },
      relations: ['rol', 'entidad'],
    });

    // ✅ asignaciones del curso (solo activas)
    const asignados = await this.cursoUsuarioRepo.find({
      where: { curso: { id_curso }, estado: { codigo: 'A' } },
      relations: ['usuario', 'rol', 'estado'],
    });

    // ✅ merge: asegura que los asignados aparezcan aunque no estén en usuariosEntidad
    const mapUsuarios = new Map<number, any>();
    for (const u of usuariosEntidad) mapUsuarios.set(u.id_usuario, u);
    for (const a of asignados) mapUsuarios.set(a.usuario.id_usuario, a.usuario);

    const allUsuarios = Array.from(mapUsuarios.values());

    return allUsuarios.map((usuario) => {
      const asignacion = asignados.find(
        (a) => a.usuario.id_usuario === usuario.id_usuario,
      );
      return {
        id_usuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        asignado: !!asignacion,
        id_rol: asignacion?.rol?.id_rol,
        rol_nombre: asignacion?.rol?.nombre,
      };
    });
  }

  async removerUsuarioDelCurso(
    id_curso: number,
    id_usuario: number,
  ): Promise<void> {
    const asignacion = await this.cursoUsuarioRepo.findOne({
      where: { curso: { id_curso }, usuario: { id_usuario } },
    });

    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    await this.cursoUsuarioRepo.remove(asignacion);
  }

  async listarMisCursos(user: any) {
    const r = this.normalizeRol(user.rol);
    const id_usuario = user.id_usuario;

    if (r === 'ADMIN') return this.listarCursosPorRol(user);

    const cursosUsuario = await this.cursoUsuarioRepo.find({
      where: {
        usuario: { id_usuario },
        estado: { codigo: 'A' },
      },
      relations: ['curso', 'curso.entidad', 'rol', 'estado'],
      order: { curso: { fecha_inicio: 'DESC' } },
    });

    const vistos = new Set<number>();

    return cursosUsuario
      .filter((cu) => {
        if (vistos.has(cu.curso.id_curso)) return false;
        vistos.add(cu.curso.id_curso);
        return true;
      })
      .map((cu) => ({
        id_curso: cu.curso.id_curso,
        nombre: cu.curso.nombre,
        descripcion: cu.curso.descripcion,
        fecha_inicio: cu.curso.fecha_inicio,
        fecha_fin: cu.curso.fecha_fin,
        fecha_registro: cu.curso.fecha_registro,
        activo: cu.curso.activo,
        entidad: cu.curso.entidad,
        miRol: cu.rol ? { id_rol: cu.rol.id_rol, nombre: cu.rol.nombre } : null,
      }));
  }

  async obtenerCursoParaUsuario(id_curso: number, user: any) {
    const id_usuario = user.id_usuario;
    const r = this.normalizeRol(user.rol);

    const curso = await this.cursoRepo.findOne({
      where: { id_curso },
      relations: ['entidad'],
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    if (r === 'ADMIN') return curso;

    const asignacion = await this.cursoUsuarioRepo.findOne({
      where: {
        curso: { id_curso },
        usuario: { id_usuario },
        estado: { codigo: 'A' },
      },
      relations: ['rol', 'estado'],
    });

    if (!asignacion)
      throw new ForbiddenException('No tienes acceso a este curso');

    return {
      ...curso,
      miRol: asignacion.rol
        ? { id_rol: asignacion.rol.id_rol, nombre: asignacion.rol.nombre }
        : null,
    };
  }
}
