import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Pregunta } from './entities/pregunta.entity';
import { OpcionRespuesta } from './entities/opcion-respuesta.entity';
import { Emparejamiento } from './entities/emparejamiento.entity';
import {
  TipoPregunta,
  TipoPreguntaCodigo,
} from './entities/tipo-pregunta.entity';
import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { BloquePregunta } from './entities/bloque-pregunta.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';

import { CrearPreguntaDto } from './dto/crear-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Injectable()
export class PreguntaService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Pregunta)
    private readonly preguntaRepo: Repository<Pregunta>,

    @InjectRepository(OpcionRespuesta)
    private readonly opcionRepo: Repository<OpcionRespuesta>,

    @InjectRepository(Emparejamiento)
    private readonly empRepo: Repository<Emparejamiento>,

    @InjectRepository(TipoPregunta)
    private readonly tipoRepo: Repository<TipoPregunta>,

    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,

    @InjectRepository(BloquePregunta)
    private readonly bloqueRepo: Repository<BloquePregunta>,

    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,
  ) {}

  private normalizeRol(rol: string): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  private round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private normalizeExpected(s: string) {
    return (s ?? '').toString().trim().toLowerCase();
  }

  private async assertDocenteEnCurso(userId: number, id_curso: number) {
    const asig = await this.cursoUsuarioRepo.findOne({
      where: {
        usuario: { id_usuario: userId } as any,
        curso: { id_curso } as any,
        estado: { codigo: 'A' } as any,
      },
      relations: ['rol', 'estado', 'curso'],
    });

    if (!asig) {
      throw new ForbiddenException('No perteneces a este curso');
    }

    const rolCurso = (asig.rol?.nombre ?? '').toString().trim().toUpperCase();

    if (rolCurso !== 'DOCENTE') {
      throw new ForbiddenException('Solo un docente puede gestionar preguntas');
    }
  }

  private async getEvaluacion(id_evaluacion: number) {
    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion },
      relations: ['curso', 'creador'],
    });

    if (!evaluacion) {
      throw new NotFoundException('Evaluación no encontrada');
    }

    return evaluacion;
  }

  private async assertGestionEvaluacion(
    id_evaluacion: number,
    userId: number,
    rol: string,
    bloquearSiActiva: boolean,
  ) {
    const r = this.normalizeRol(rol);
    const evaluacion = await this.getEvaluacion(id_evaluacion);

    if (r !== 'ADMIN') {
      if (!evaluacion.creador || evaluacion.creador.id_usuario !== userId) {
        throw new ForbiddenException(
          'No autorizado para gestionar preguntas de esta evaluación',
        );
      }

      await this.assertDocenteEnCurso(userId, evaluacion.curso.id_curso);
    }

    if (bloquearSiActiva && evaluacion.activa) {
      evaluacion.activa = false;
      await this.evaluacionRepo.save(evaluacion);
    }

    return evaluacion;
  }

  private async validarPorTipo(
    tipo: TipoPregunta,
    dto: CrearPreguntaDto | UpdatePreguntaDto | any,
    _contexto: { esSubpreguntaDeBloque: boolean },
  ) {
    if (!tipo.activo) {
      throw new BadRequestException('Tipo de pregunta inactivo');
    }

    const codigo = tipo.codigo;

    if (
      codigo === TipoPreguntaCodigo.LISTENING ||
      codigo === TipoPreguntaCodigo.READING
    ) {
      throw new BadRequestException(
        'LISTENING/READING se crean como BLOQUE, no como pregunta directa',
      );
    }

    const opciones = dto.opcionesRespuesta ?? undefined;
    const pares = dto.emparejamientos ?? undefined;

    if (codigo === TipoPreguntaCodigo.WRITING) {
      if (opciones?.length) {
        throw new BadRequestException('WRITING no permite opciones');
      }

      if (pares?.length) {
        throw new BadRequestException('WRITING no permite emparejamientos');
      }

      const resp = dto.respuesta_esperada;
      const normalizada = resp ? this.normalizeExpected(resp) : null;

      return {
        usaOpciones: false,
        usaPares: false,
        respuesta_esperada: normalizada,
        auto_calificable: !!normalizada,
      };
    }

    if (codigo === TipoPreguntaCodigo.SPEAKING) {
      if (opciones?.length) {
        throw new BadRequestException('SPEAKING no permite opciones');
      }

      if (pares?.length) {
        throw new BadRequestException('SPEAKING no permite emparejamientos');
      }

      return {
        usaOpciones: false,
        usaPares: false,
        respuesta_esperada: null,
        auto_calificable: false,
      };
    }

    if (codigo === TipoPreguntaCodigo.MATCHING) {
      if (opciones?.length) {
        throw new BadRequestException(
          'MATCHING no usa opciones multiple choice',
        );
      }

      if (!pares || pares.length < 2) {
        throw new BadRequestException('MATCHING requiere al menos 2 pares');
      }

      return {
        usaOpciones: false,
        usaPares: true,
        respuesta_esperada: null,
        auto_calificable: true,
      };
    }

    if (codigo === TipoPreguntaCodigo.MULTIPLE_CHOICE) {
      if (!opciones || opciones.length < 2) {
        throw new BadRequestException('Debe tener al menos 2 opciones');
      }

      const correctas = opciones.filter((o: any) => !!o.es_correcta).length;

      if (tipo.requiere_seleccion && correctas < 1) {
        throw new BadRequestException('Marca al menos una opción correcta');
      }

      if (pares?.length) {
        throw new BadRequestException(
          'MULTIPLE_CHOICE no permite emparejamientos',
        );
      }

      return {
        usaOpciones: true,
        usaPares: false,
        respuesta_esperada: null,
        auto_calificable: true,
      };
    }

    if (codigo === TipoPreguntaCodigo.TRUE_FALSE) {
      if (pares?.length) {
        throw new BadRequestException('TRUE_FALSE no permite emparejamientos');
      }

      if (!opciones || opciones.length !== 2) {
        throw new BadRequestException(
          'TRUE_FALSE requiere exactamente 2 opciones (True/False)',
        );
      }

      const correctas = opciones.filter((o: any) => !!o.es_correcta).length;

      if (correctas !== 1) {
        throw new BadRequestException(
          'TRUE_FALSE requiere exactamente una opción correcta',
        );
      }

      return {
        usaOpciones: true,
        usaPares: false,
        respuesta_esperada: null,
        auto_calificable: true,
      };
    }

    if (codigo === TipoPreguntaCodigo.CHOOSE_IMAGE) {
      if (pares?.length) {
        throw new BadRequestException(
          'CHOOSE_IMAGE no permite emparejamientos',
        );
      }

      if (!opciones || opciones.length !== 2) {
        throw new BadRequestException(
          'CHOOSE_IMAGE requiere exactamente 2 opciones (imágenes)',
        );
      }

      const sinImagen = opciones.some((o: any) => !o.url_imagen);

      if (sinImagen) {
        throw new BadRequestException(
          'Cada opción de CHOOSE_IMAGE requiere url_imagen',
        );
      }

      const correctas = opciones.filter((o: any) => !!o.es_correcta).length;

      if (correctas !== 1) {
        throw new BadRequestException(
          'CHOOSE_IMAGE requiere exactamente una opción correcta',
        );
      }

      return {
        usaOpciones: true,
        usaPares: false,
        respuesta_esperada: null,
        auto_calificable: true,
      };
    }

    // FILL_BLANK
    if (codigo === TipoPreguntaCodigo.FILL_BLANK) {
      const textoBase = (dto as any).texto_base;
      if (!textoBase || !String(textoBase).trim()) {
        throw new BadRequestException(
          'FILL_BLANK requiere el párrafo con los espacios (texto_base)',
        );
      }
      if (!pares || pares.length < 1) {
        throw new BadRequestException(
          'FILL_BLANK requiere al menos 1 espacio (emparejamiento espacio→palabra)',
        );
      }
      if (!opciones || opciones.length < 2) {
        throw new BadRequestException(
          'FILL_BLANK requiere el banco de palabras (mínimo 2 opciones)',
        );
      }

      const texto = String(textoBase);
      for (const par of pares) {
        const token = `{{blank_${par.izquierda}}}`;
        if (!texto.includes(token)) {
          throw new BadRequestException(
            `El párrafo no contiene el espacio ${token}`,
          );
        }
      }

      return {
        usaOpciones: true,
        usaPares: true,
        respuesta_esperada: null,
        auto_calificable: true,
        texto_base: texto.trim(),
      };
    }

    throw new BadRequestException('Tipo de pregunta no soportado');
  }

  private construirDtoValidacionEdicion(
    pregunta: Pregunta,
    dto: UpdatePreguntaDto,
    cambiaTipo: boolean,
  ) {
    return {
      ...dto,

      opcionesRespuesta:
        dto.opcionesRespuesta !== undefined
          ? dto.opcionesRespuesta
          : cambiaTipo
            ? undefined
            : pregunta.opcionesRespuesta?.map((o: any) => ({
                texto: o.texto,
                url_imagen: o.url_imagen,
                es_correcta: o.es_correcta,
              })),

      emparejamientos:
        dto.emparejamientos !== undefined
          ? dto.emparejamientos
          : cambiaTipo
            ? undefined
            : pregunta.emparejamientos?.map((p: any) => ({
                izquierda: p.izquierda,
                derecha: p.derecha,
              })),

      respuesta_esperada:
        dto.respuesta_esperada !== undefined
          ? dto.respuesta_esperada
          : (pregunta.respuesta_esperada ?? undefined),
    };
  }

  /**
   * Recalcula puntaje para TODAS las preguntas de una evaluación:
   * - Preguntas sueltas
   * - Subpreguntas que pertenecen a bloques de la evaluación
   *
   * Todas quedan con el mismo puntaje = 100 / total.
   */
  private async recalcularPuntajesEvaluacion(
    id_evaluacion: number,
    manager?: any,
  ) {
    const preguntaRepo = manager?.getRepository(Pregunta) ?? this.preguntaRepo;
    const bloqueRepo =
      manager?.getRepository(BloquePregunta) ?? this.bloqueRepo;

    const totalSueltas = await preguntaRepo.count({
      where: {
        evaluacion: { id_evaluacion } as any,
        bloque: null as any,
      },
    });

    const totalSub = await preguntaRepo
      .createQueryBuilder('p')
      .innerJoin('p.bloque', 'b')
      .where('b.id_evaluacion = :id_evaluacion', { id_evaluacion })
      .getCount();

    const total = totalSueltas + totalSub;

    if (total <= 0) {
      return { total: 0, puntaje: 0 };
    }

    const puntaje = this.round2(100 / total);

    await preguntaRepo
      .createQueryBuilder()
      .update(Pregunta)
      .set({ puntaje })
      .where('id_evaluacion = :id_evaluacion', { id_evaluacion })
      .andWhere('id_bloque IS NULL')
      .execute();

    const bloques = await bloqueRepo.find({
      where: { evaluacion: { id_evaluacion } as any },
      select: ['id_bloque'],
    });

    const ids = (bloques ?? []).map((b) => b.id_bloque);

    if (ids.length > 0) {
      await preguntaRepo
        .createQueryBuilder()
        .update(Pregunta)
        .set({ puntaje })
        .where('id_bloque IN (:...ids)', { ids })
        .execute();
    }

    return { total, puntaje };
  }

  // ======================================================
  // CREAR PREGUNTA SUELTA EN EVALUACIÓN
  // ======================================================

  async crearEnEvaluacion(
    id_evaluacion: number,
    dto: CrearPreguntaDto,
    userId: number,
    rol: string,
  ) {
    await this.assertGestionEvaluacion(id_evaluacion, userId, rol, true);

    const tipo = await this.tipoRepo.findOne({
      where: { id_tipo_pregunta: dto.id_tipo_pregunta },
    });

    if (!tipo) {
      throw new BadRequestException('Tipo inválido');
    }

    const reglas = await this.validarPorTipo(tipo, dto, {
      esSubpreguntaDeBloque: false,
    });

    const pregunta = this.preguntaRepo.create({
      texto: dto.texto,
      puntaje: 0, // ✅ NO viene del front
      url_multimedia: dto.url_multimedia ?? null,
      texto_base: (reglas as any).texto_base ?? null, // ✅ NUEVO
      respuesta_esperada: reglas.respuesta_esperada ?? null,
      auto_calificable: reglas.auto_calificable ?? false,
      evaluacion: { id_evaluacion } as any,
      bloque: null,
      tipo: { id_tipo_pregunta: tipo.id_tipo_pregunta } as any,
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Pregunta).save(pregunta);

      if (reglas.usaOpciones && dto.opcionesRespuesta?.length) {
        const ops = dto.opcionesRespuesta.map((o) =>
          manager.getRepository(OpcionRespuesta).create({
            texto: o.texto ?? null,
            url_imagen: o.url_imagen ?? null,
            es_correcta: !!o.es_correcta,
            pregunta: { id_pregunta: saved.id_pregunta } as any,
          }),
        );

        await manager.getRepository(OpcionRespuesta).save(ops);
      }

      if (reglas.usaPares && dto.emparejamientos?.length) {
        const pares = dto.emparejamientos.map((p) =>
          manager.getRepository(Emparejamiento).create({
            izquierda: p.izquierda,
            derecha: p.derecha,
            pregunta: { id_pregunta: saved.id_pregunta } as any,
          }),
        );

        await manager.getRepository(Emparejamiento).save(pares);
      }

      await this.recalcularPuntajesEvaluacion(id_evaluacion, manager);

      return manager.getRepository(Pregunta).findOne({
        where: { id_pregunta: saved.id_pregunta },
        relations: ['tipo', 'opcionesRespuesta', 'emparejamientos'],
      });
    });
  }

  // ======================================================
  // LISTAR PREGUNTAS SUELTAS DE UNA EVALUACIÓN
  // ======================================================

  async listarPorEvaluacion(
    id_evaluacion: number,
    userId: number,
    rol: string,
  ) {
    await this.assertGestionEvaluacion(id_evaluacion, userId, rol, false);

    return this.preguntaRepo.find({
      where: {
        evaluacion: { id_evaluacion } as any,
        bloque: null as any,
      },
      relations: ['tipo', 'opcionesRespuesta', 'emparejamientos'],
      order: { id_pregunta: 'ASC' },
    });
  }

  // ======================================================
  // EDITAR PREGUNTA SUELTA
  // ======================================================

  async editarPregunta(
    id_pregunta: number,
    dto: UpdatePreguntaDto,
    userId: number,
    rol: string,
  ) {
    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: [
        'evaluacion',
        'evaluacion.curso',
        'evaluacion.creador',
        'tipo',
        'bloque',
        'opcionesRespuesta',
        'emparejamientos',
      ],
    });

    if (!pregunta) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    if (pregunta.bloque) {
      throw new BadRequestException(
        'Esta pregunta pertenece a un bloque; edítala por el flujo de bloques',
      );
    }

    await this.assertGestionEvaluacion(
      pregunta.evaluacion!.id_evaluacion,
      userId,
      rol,
      true,
    );

    const tipoFinalId = dto.id_tipo_pregunta ?? pregunta.tipo.id_tipo_pregunta;

    const tipo = await this.tipoRepo.findOne({
      where: { id_tipo_pregunta: tipoFinalId },
    });

    if (!tipo) {
      throw new BadRequestException('Tipo inválido');
    }

    const cambiaTipo = tipoFinalId !== pregunta.tipo.id_tipo_pregunta;

    const dtoValidacion = this.construirDtoValidacionEdicion(
      pregunta,
      dto,
      cambiaTipo,
    );

    const reglas = await this.validarPorTipo(tipo, dtoValidacion, {
      esSubpreguntaDeBloque: false,
    });

    if (dto.texto !== undefined) {
      pregunta.texto = dto.texto;
    }

    if (dto.url_multimedia !== undefined) {
      pregunta.url_multimedia = dto.url_multimedia ?? null;
    }

    pregunta.respuesta_esperada = reglas.respuesta_esperada ?? null;
    pregunta.auto_calificable = reglas.auto_calificable ?? false;
    pregunta.tipo = { id_tipo_pregunta: tipo.id_tipo_pregunta } as any;
    pregunta.texto_base = (reglas as any).texto_base ?? null; // ✅ NUEVO

    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Pregunta).save(pregunta);

      const debeReemplazarOpciones =
        dto.opcionesRespuesta !== undefined ||
        cambiaTipo ||
        !reglas.usaOpciones;

      if (debeReemplazarOpciones) {
        await manager
          .getRepository(OpcionRespuesta)
          .delete({ pregunta: { id_pregunta } as any });

        if (reglas.usaOpciones && dtoValidacion.opcionesRespuesta?.length) {
          const ops = dtoValidacion.opcionesRespuesta.map((o: any) =>
            manager.getRepository(OpcionRespuesta).create({
              texto: o.texto ?? null,
              url_imagen: o.url_imagen ?? null,
              es_correcta: !!o.es_correcta,
              pregunta: { id_pregunta } as any,
            }),
          );

          await manager.getRepository(OpcionRespuesta).save(ops);
        }
      }

      const debeReemplazarPares =
        dto.emparejamientos !== undefined || cambiaTipo || !reglas.usaPares;

      if (debeReemplazarPares) {
        await manager
          .getRepository(Emparejamiento)
          .delete({ pregunta: { id_pregunta } as any });

        if (reglas.usaPares && dtoValidacion.emparejamientos?.length) {
          const pares = dtoValidacion.emparejamientos.map((p: any) =>
            manager.getRepository(Emparejamiento).create({
              izquierda: p.izquierda,
              derecha: p.derecha,
              pregunta: { id_pregunta } as any,
            }),
          );

          await manager.getRepository(Emparejamiento).save(pares);
        }
      }

      await this.recalcularPuntajesEvaluacion(
        pregunta.evaluacion!.id_evaluacion,
        manager,
      );

      return manager.getRepository(Pregunta).findOne({
        where: { id_pregunta },
        relations: ['tipo', 'opcionesRespuesta', 'emparejamientos'],
      });
    });
  }

  // ======================================================
  // ELIMINAR PREGUNTA SUELTA
  // ======================================================

  async eliminar(id_pregunta: number, userId: number, rol: string) {
    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: [
        'evaluacion',
        'evaluacion.curso',
        'evaluacion.creador',
        'bloque',
      ],
    });

    if (!pregunta) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    if (pregunta.bloque) {
      throw new BadRequestException(
        'Esta pregunta pertenece a un bloque; elimínala desde el bloque',
      );
    }

    await this.assertGestionEvaluacion(
      pregunta.evaluacion!.id_evaluacion,
      userId,
      rol,
      true,
    );

    const idEval = pregunta.evaluacion!.id_evaluacion;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(OpcionRespuesta)
        .delete({ pregunta: { id_pregunta } as any });

      await manager
        .getRepository(Emparejamiento)
        .delete({ pregunta: { id_pregunta } as any });

      await manager.getRepository(Pregunta).delete({ id_pregunta });

      await this.recalcularPuntajesEvaluacion(idEval, manager);
    });

    return { ok: true };
  }
}
