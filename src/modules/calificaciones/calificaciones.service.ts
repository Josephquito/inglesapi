import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';
import {
  EvaluacionIntento,
  IntentoEstado,
} from '../rendiciones/entities/evaluacion-intento.entity';

import { CalificacionEstado } from './dto/calificacion-estado.enum';
import { MisCalificacionesCursoResponseDto } from './dto/mis-calificaciones-curso.dto';
import { CalificacionesCursoDocenteResponseDto } from './dto/calificaciones-curso-docente.dto';

@Injectable()
export class CalificacionesService {
  constructor(
    @InjectRepository(Evaluacion)
    private readonly evalRepo: Repository<Evaluacion>,

    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,

    @InjectRepository(EvaluacionIntento)
    private readonly intentoRepo: Repository<EvaluacionIntento>,
  ) {}

  private normalizeRol(rol: string): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  /**
   * Valida que el usuario pertenece al curso (activo).
   */
  private async assertPerteneceCurso(userId: number, id_curso: number) {
    const asig = await this.cursoUsuarioRepo.findOne({
      where: {
        usuario: { id_usuario: userId } as any,
        curso: { id_curso } as any,
        estado: { codigo: 'A' } as any,
      },
      relations: ['rol', 'estado', 'curso'],
    });

    if (!asig) throw new ForbiddenException('No perteneces a este curso');
    return asig;
  }

  /**
   * Valida que el usuario sea DOCENTE o ADMIN dentro del curso.
   * (Importante: el rol global del JWT no basta; aquí manda el rol en CursoUsuario).
   */
  private async assertDocenteEnCurso(userId: number, id_curso: number) {
    const asig = await this.assertPerteneceCurso(userId, id_curso);
    const rolCurso = (asig.rol?.codigo ?? '').toString().trim().toUpperCase();

    if (!['DOCENTE', 'ADMIN'].includes(rolCurso)) {
      throw new ForbiddenException(
        'No tienes permisos para ver calificaciones de este curso',
      );
    }

    return asig;
  }

  private estadoFromIntento(
    it: EvaluacionIntento | null | undefined,
  ): CalificacionEstado {
    if (!it) return CalificacionEstado.SIN_ENTREGAR;
    return it.pendiente_revision
      ? CalificacionEstado.PENDIENTE_REVISION
      : CalificacionEstado.CALIFICADO;
  }

  /**
   * ===========================================================
   * ✅ ESTUDIANTE: Mis calificaciones por curso
   * Reglas:
   * - Solo 1 intento visible por evaluación
   * - Prioriza intentos ENTREGADOS y CALIFICADOS (pendiente_revision=false)
   * - Si no hay calificado, toma el mejor ENTREGADO (pendiente)
   * ===========================================================
   */
  async misCalificacionesCurso(
    id_curso: number,
    userId: number,
    rol: string,
  ): Promise<MisCalificacionesCursoResponseDto> {
    const r = this.normalizeRol(rol);

    // ADMIN puede consultar sin pertenecer
    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(userId, id_curso);
    }

    const evaluaciones = await this.evalRepo.find({
      where: { curso: { id_curso } as any },
      order: { id_evaluacion: 'ASC' },
    });

    // 1 intento visible por evaluación, priorizando CALIFICADO
    const rows = await this.intentoRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.evaluacion', 'e')
      .innerJoin('e.curso', 'c')
      .where('c.id_curso = :id_curso', { id_curso })
      .andWhere('i.id_estudiante = :userId', { userId })
      .andWhere('i.estado = :estado', { estado: IntentoEstado.ENTREGADO })
      .distinctOn(['e.id_evaluacion'])
      .orderBy('e.id_evaluacion', 'ASC')
      // ✅ primero calificados
      .addOrderBy(
        'CASE WHEN i.pendiente_revision = false THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('i.puntaje_total', 'DESC')
      .addOrderBy('i.updated_at', 'DESC')
      .getMany();

    const map = new Map<number, EvaluacionIntento>();
    for (const it of rows) {
      map.set((it as any).evaluacion?.id_evaluacion, it);
    }

    return {
      curso: { id_curso },
      evaluaciones: evaluaciones.map((e) => {
        const it = map.get(e.id_evaluacion) ?? null;

        return {
          id_evaluacion: e.id_evaluacion,
          titulo: e.titulo,
          activa: e.activa,
          estado_calificacion: this.estadoFromIntento(it),
          intento_visible: it
            ? {
                id_intento: it.id_intento,
                numero_intento: it.numero_intento,
                puntaje_total: Number(it.puntaje_total),
                calificacion: Number(it.calificacion),
                pendiente_revision: it.pendiente_revision,
                fin_real: it.fin_real,
                updated_at: it.updated_at,
              }
            : null,
        };
      }),
    };
  }

  /**
   * ===========================================================
   * ✅ DOCENTE/ADMIN: Calificaciones del curso (matriz)
   * - Lista estudiantes activos del curso
   * - Lista evaluaciones del curso
   * - 1 intento visible por (estudiante, evaluacion) con la misma regla:
   *   calificado primero, si no, pendiente.
   * ===========================================================
   */
  async calificacionesCurso(
    id_curso: number,
    userId: number,
    rol: string,
  ): Promise<CalificacionesCursoDocenteResponseDto> {
    const r = this.normalizeRol(rol);

    if (r !== 'ADMIN') {
      await this.assertDocenteEnCurso(userId, id_curso);
    }

    const evaluaciones = await this.evalRepo.find({
      where: { curso: { id_curso } as any },
      order: { id_evaluacion: 'ASC' },
    });

    // estudiantes activos del curso (solo rol ESTUDIANTE en CursoUsuario)
    const estudiantesAsig = await this.cursoUsuarioRepo.find({
      where: {
        curso: { id_curso } as any,
        estado: { codigo: 'A' } as any,
        rol: { codigo: 'ESTUDIANTE' } as any,
      },
      relations: ['usuario'],
    });

    const estudiantes = estudiantesAsig.map((a) => a.usuario);

    // 1 intento visible por (evaluacion, estudiante)
    const intentos = await this.intentoRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.estudiante', 'u')
      .innerJoinAndSelect('i.evaluacion', 'e')
      .innerJoin('e.curso', 'c')
      .where('c.id_curso = :id_curso', { id_curso })
      .andWhere('i.estado = :estado', { estado: IntentoEstado.ENTREGADO })
      .distinctOn(['e.id_evaluacion', 'u.id_usuario'])
      .orderBy('e.id_evaluacion', 'ASC')
      .addOrderBy('u.id_usuario', 'ASC')
      // ✅ primero calificados
      .addOrderBy(
        'CASE WHEN i.pendiente_revision = false THEN 0 ELSE 1 END',
        'ASC',
      )
      .addOrderBy('i.puntaje_total', 'DESC')
      .addOrderBy('i.updated_at', 'DESC')
      .getMany();

    const map = new Map<number, Map<number, EvaluacionIntento>>();
    for (const it of intentos) {
      const uid = (it as any).estudiante?.id_usuario;
      const eid = (it as any).evaluacion?.id_evaluacion;
      if (!map.has(uid)) map.set(uid, new Map());
      map.get(uid)!.set(eid, it);
    }

    return {
      curso: { id_curso },
      evaluaciones: evaluaciones.map((e) => ({
        id_evaluacion: e.id_evaluacion,
        titulo: e.titulo,
      })),
      estudiantes: estudiantes.map((u) => ({
        id_usuario: u.id_usuario,
        nombres: u.nombres,
        apellidos: u.apellidos,
        username: u.username,
        email: u.email,
        calificaciones: evaluaciones.map((e) => {
          const it = map.get(u.id_usuario)?.get(e.id_evaluacion) ?? null;

          return {
            id_evaluacion: e.id_evaluacion,
            estado_calificacion: this.estadoFromIntento(it),
            intento_visible: it
              ? {
                  id_intento: it.id_intento,
                  puntaje_total: Number(it.puntaje_total),
                  calificacion: Number(it.calificacion),
                  pendiente_revision: it.pendiente_revision,
                  updated_at: it.updated_at,
                }
              : null,
          };
        }),
      })),
    };
  }
}
