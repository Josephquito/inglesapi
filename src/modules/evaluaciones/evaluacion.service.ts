/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';

import { Evaluacion } from 'src/modules/evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from 'src/modules/cursos/entities/curso-usuario.entity';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { EvaluacionDto } from 'src/modules/evaluaciones/dto/evaluacion.dto';

@Injectable()
export class EvaluacionService {
  constructor(
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,

    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,

    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  private normalizeRol(rol: string): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  private async getUsuarioEntidad(userId: number) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: userId },
      relations: ['entidad'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  private async getAsignacionCurso(userId: number, id_curso: number) {
    const asig = await this.cursoUsuarioRepo.findOne({
      where: {
        usuario: { id_usuario: userId },
        curso: { id_curso },
        estado: { codigo: 'A' },
      },
      relations: ['rol', 'estado', 'curso'],
    });
    if (!asig) throw new ForbiddenException('No perteneces a este curso');
    return asig;
  }

  private async assertDocenteEnCurso(userId: number, id_curso: number) {
    const asig = await this.getAsignacionCurso(userId, id_curso);

    const rolCurso = (asig?.rol?.nombre ?? '').toString().trim().toUpperCase();

    if (rolCurso !== 'DOCENTE') {
      throw new ForbiddenException(
        'Solo un docente puede gestionar evaluaciones en este curso',
      );
    }

    return asig;
  }

  // ===== Crear evaluación dentro del curso (INACTIVA) =====
  async crearEnCurso(
    id_curso: number,
    dto: EvaluacionDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    // ADMIN pasa directo; DOCENTE debe ser DOCENTE en ese curso
    if (r !== 'ADMIN') {
      await this.assertDocenteEnCurso(userId, id_curso);
    }

    const usuario = await this.getUsuarioEntidad(userId);

    if (!usuario.entidad) {
      throw new BadRequestException(
        'Tu usuario aún no está asignado a una entidad. Asigna una entidad antes de crear evaluaciones.',
      );
    }

    const evaluacion = this.evaluacionRepo.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion ?? '',
      fecha_inicio: dto.fecha_inicio ?? new Date(),
      fecha_fin: dto.fecha_fin ?? null,

      es_calificada: dto.es_calificada ?? false,
      calificacion: dto.calificacion ?? 0,
      calificacion_requerida: dto.calificacion_requerida ?? 0,

      tiene_intentos: dto.tiene_intentos ?? false,
      intentos: dto.intentos ?? 1,

      numero_a_mostrar: dto.numero_a_mostrar ?? 0,

      tiene_tiempo: dto.tiene_tiempo ?? false,
      minutos: dto.minutos ?? 0,

      valida_fraude: dto.valida_fraude ?? false,
      usa_camara: dto.usa_camara ?? false,

      // clave del flujo:
      activa: false,

      // relaciones
      curso: { id_curso } as any,
      creador: { id_usuario: userId } as any,
      entidad: usuario.entidad,
    });

    const nueva = await this.evaluacionRepo.save(evaluacion);
    return instanceToPlain(nueva);
  }

  // ===== Docente/Admin: listar TODAS las evaluaciones del curso =====
  async listarPorCursoDocente(id_curso: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    if (r !== 'ADMIN') {
      await this.assertDocenteEnCurso(userId, id_curso);
    }

    const data = await this.evaluacionRepo.find({
      where: { curso: { id_curso } },
      relations: ['creador', 'curso'],
      order: { id_evaluacion: 'DESC' },
    });

    return data.map((e) => instanceToPlain(e));
  }

  // ===== Estudiante: listar solo ACTIVAS del curso =====
  async listarActivasPorCurso(id_curso: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    // estudiante y docente deben pertenecer al curso; admin no necesita
    if (r !== 'ADMIN') {
      await this.getAsignacionCurso(userId, id_curso);
    }

    const data = await this.evaluacionRepo.find({
      where: { curso: { id_curso }, activa: true },
      relations: ['curso'],
      order: { id_evaluacion: 'DESC' },
    });

    return data.map((e) => instanceToPlain(e));
  }

  // ===== Obtener por id con control de acceso =====
  async obtenerPorIdConAcceso(
    id_evaluacion: number,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion },
      relations: ['curso', 'creador', 'entidad'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    // ✅ FIX: si viene sin curso, no revientes con 500
    if (!evaluacion.curso) {
      throw new BadRequestException(
        'Evaluación inválida: no está asociada a un curso (id_curso es NULL). Revisa datos/migración.',
      );
    }

    if (r === 'ADMIN') return instanceToPlain(evaluacion);

    await this.getAsignacionCurso(userId, evaluacion.curso.id_curso);

    if (r === 'ESTUDIANTE' && !evaluacion.activa) {
      throw new ForbiddenException('Esta evaluación no está disponible');
    }

    return instanceToPlain(evaluacion);
  }

  // ===== Editar: solo creador (docente) o admin =====
  async actualizar(
    id: number,
    dto: EvaluacionDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion: id },
      relations: ['creador', 'curso'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    if (r !== 'ADMIN') {
      // debe ser el creador
      if (!evaluacion.creador || evaluacion.creador.id_usuario !== userId) {
        throw new ForbiddenException(
          'No autorizado para editar esta evaluación',
        );
      }
      // y además ser docente en el curso
      await this.assertDocenteEnCurso(userId, evaluacion.curso.id_curso);
    }

    // Actualiza campos editables
    evaluacion.titulo = dto.titulo ?? evaluacion.titulo;
    evaluacion.descripcion = dto.descripcion ?? evaluacion.descripcion;
    evaluacion.fecha_inicio = dto.fecha_inicio ?? evaluacion.fecha_inicio;
    evaluacion.fecha_fin = dto.fecha_fin ?? evaluacion.fecha_fin;

    evaluacion.es_calificada = dto.es_calificada ?? evaluacion.es_calificada;
    evaluacion.calificacion = dto.calificacion ?? evaluacion.calificacion;
    evaluacion.calificacion_requerida =
      dto.calificacion_requerida ?? evaluacion.calificacion_requerida;

    evaluacion.tiene_intentos = dto.tiene_intentos ?? evaluacion.tiene_intentos;
    evaluacion.intentos = dto.intentos ?? evaluacion.intentos;

    evaluacion.numero_a_mostrar =
      dto.numero_a_mostrar ?? evaluacion.numero_a_mostrar;

    evaluacion.tiene_tiempo = dto.tiene_tiempo ?? evaluacion.tiene_tiempo;
    evaluacion.minutos = dto.minutos ?? evaluacion.minutos;

    evaluacion.valida_fraude = dto.valida_fraude ?? evaluacion.valida_fraude;
    evaluacion.usa_camara = dto.usa_camara ?? evaluacion.usa_camara;

    // activa NO se edita aquí (se hace con activar/inactivar)
    // evaluacion.activa = dto.activa ?? evaluacion.activa;  // <-- NO

    const saved = await this.evaluacionRepo.save(evaluacion);
    return instanceToPlain(saved);
  }

  // ===== Activar/Inactivar: solo creador o admin =====
  async setActiva(
    id_evaluacion: number,
    activa: boolean,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion },
      relations: ['creador', 'curso'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    if (r !== 'ADMIN') {
      if (!evaluacion.creador || evaluacion.creador.id_usuario !== userId) {
        throw new ForbiddenException(
          'No autorizado para cambiar el estado de esta evaluación',
        );
      }
      await this.assertDocenteEnCurso(userId, evaluacion.curso.id_curso);
    }

    evaluacion.activa = activa;
    await this.evaluacionRepo.save(evaluacion);

    return { ok: true, activa };
  }

  // ===== Borrar físico: solo creador o admin =====
  async eliminarFisico(
    id_evaluacion: number,
    userId: number,
    rol: string,
  ): Promise<void> {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion },
      relations: ['creador', 'curso'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    if (r !== 'ADMIN') {
      if (!evaluacion.creador || evaluacion.creador.id_usuario !== userId) {
        throw new ForbiddenException(
          'No autorizado para eliminar esta evaluación',
        );
      }
      await this.assertDocenteEnCurso(userId, evaluacion.curso.id_curso);
    }

    // OJO: cuando tengas preguntas/intentos, aquí decides:
    // - CASCADE preguntas
    // - RESTRICT si hay intentos
    await this.evaluacionRepo.delete({ id_evaluacion });
  }
}
