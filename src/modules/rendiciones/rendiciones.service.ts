import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';
import { Pregunta } from '../preguntas/entities/pregunta.entity';
import { BloquePregunta } from '../preguntas/entities/bloque-pregunta.entity';
import { OpcionRespuesta } from '../preguntas/entities/opcion-respuesta.entity';
import { Emparejamiento } from '../preguntas/entities/emparejamiento.entity';
import { TipoPreguntaCodigo } from '../preguntas/entities/tipo-pregunta.entity';

import {
  EvaluacionIntento,
  IntentoEstado,
} from './entities/evaluacion-intento.entity';
import { RespuestaIntento } from './entities/respuesta-intento.entity';
import { GuardarRespuestaDto } from './dto/guardar-respuesta.dto';
import { CalificarRespuestaDto } from './dto/calificar-respuesta.dto';
import {
  ProctoringVideoDto,
  ProctoringWarnDto,
} from './dto/proctoring-video.dto';

@Injectable()
export class RendicionesService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Evaluacion)
    private readonly evalRepo: Repository<Evaluacion>,

    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,

    @InjectRepository(Pregunta)
    private readonly preguntaRepo: Repository<Pregunta>,

    @InjectRepository(BloquePregunta)
    private readonly bloqueRepo: Repository<BloquePregunta>,

    @InjectRepository(OpcionRespuesta)
    private readonly opcionRepo: Repository<OpcionRespuesta>,

    @InjectRepository(Emparejamiento)
    private readonly empRepo: Repository<Emparejamiento>,

    @InjectRepository(EvaluacionIntento)
    private readonly intentoRepo: Repository<EvaluacionIntento>,

    @InjectRepository(RespuestaIntento)
    private readonly respRepo: Repository<RespuestaIntento>,
  ) {}

  private normalizeRol(rol: string): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  private round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

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

  private async getEvaluacionActivaConAcceso(
    id_evaluacion: number,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evalRepo.findOne({
      where: { id_evaluacion },
      relations: ['curso'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    if (!evaluacion.curso)
      throw new BadRequestException('Evaluación sin curso');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(userId, evaluacion.curso.id_curso);
    }

    if (r === 'ESTUDIANTE' && !evaluacion.activa) {
      throw new ForbiddenException('Esta evaluación no está disponible');
    }

    return evaluacion;
  }

  private computeFinProgramado(evaluacion: Evaluacion, inicio: Date) {
    if (!evaluacion.tiene_tiempo || !evaluacion.minutos) return null;
    const fin = new Date(inicio.getTime() + evaluacion.minutos * 60_000);
    return fin;
  }

  private assertNoExpirado(intento: EvaluacionIntento) {
    if (intento.estado !== IntentoEstado.EN_PROGRESO) {
      throw new ForbiddenException('El intento no está en progreso');
    }
    if (
      intento.fin_programado &&
      new Date() > new Date(intento.fin_programado)
    ) {
      // lo dejamos que el flujo lo marque como expirado
      throw new ForbiddenException('Tiempo agotado');
    }
  }

  private assertIntentoActivo(intento: EvaluacionIntento) {
    if (intento.estado !== IntentoEstado.EN_PROGRESO) {
      throw new ForbiddenException('El intento no está en progreso');
    }
    if ((intento as any).suspendido) {
      throw new ForbiddenException('Intento suspendido por fraude');
    }
  }

  // ========= 1) Modal info =========
  async infoRendir(id_evaluacion: number, userId: number, rol: string) {
    const evaluacion = await this.getEvaluacionActivaConAcceso(
      id_evaluacion,
      userId,
      rol,
    );

    // intentos usados
    const usados = await this.intentoRepo.count({
      where: {
        evaluacion: { id_evaluacion } as any,
        estudiante: { id_usuario: userId } as any,
      },
    });

    const max = evaluacion.tiene_intentos ? (evaluacion.intentos ?? 1) : 1;
    const restantes = Math.max(0, max - usados);

    return {
      id_evaluacion: evaluacion.id_evaluacion,
      titulo: evaluacion.titulo,
      descripcion: evaluacion.descripcion,
      tiene_tiempo: evaluacion.tiene_tiempo,
      minutos: evaluacion.minutos,
      tiene_intentos: evaluacion.tiene_intentos,
      intentos: max,
      intentos_usados: usados,
      intentos_restantes: restantes,
      puede_iniciar: restantes > 0,
    };
  }

  // ========= 2) Iniciar intento =========
  async iniciarIntento(id_evaluacion: number, userId: number, rol: string) {
    const evaluacion = await this.getEvaluacionActivaConAcceso(
      id_evaluacion,
      userId,
      rol,
    );

    // Estudiante solo si activa (ya validado arriba)
    if (!evaluacion.activa) {
      // por si ADMIN/DOCENTE quieren probar
      throw new ForbiddenException('Evaluación inactiva');
    }

    // cuántos intentos lleva
    const usados = await this.intentoRepo.count({
      where: {
        evaluacion: { id_evaluacion } as any,
        estudiante: { id_usuario: userId } as any,
      },
    });

    const max = evaluacion.tiene_intentos ? (evaluacion.intentos ?? 1) : 1;
    if (usados >= max) {
      throw new ForbiddenException('Ya agotaste tus intentos');
    }

    const numero_intento = usados + 1;
    const inicio = new Date();
    const fin_programado = this.computeFinProgramado(evaluacion, inicio);

    const intento = this.intentoRepo.create({
      evaluacion: { id_evaluacion } as any,
      estudiante: { id_usuario: userId } as any,
      numero_intento,
      estado: IntentoEstado.EN_PROGRESO,
      inicio,
      fin_programado,
      fin_real: null,
      puntaje_total: 0,
      calificacion: 0,
      pendiente_revision: false,
    });

    const saved = await this.intentoRepo.save(intento);

    return {
      id_intento: saved.id_intento,
      inicio: saved.inicio,
      fin_programado: saved.fin_programado,
      estado: saved.estado,
      numero_intento: saved.numero_intento,
    };
  }

  // ========= 3) Obtener preguntas para rendir =========
  async obtenerPreguntasParaRendir(
    id_intento: number,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );

      // estudiante solo ve su intento
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    // Traer preguntas sueltas + bloques + subpreguntas
    const sueltas = await this.preguntaRepo.find({
      where: {
        evaluacion: { id_evaluacion: intento.evaluacion.id_evaluacion } as any,
        bloque: null as any,
      },
      relations: ['tipo', 'opcionesRespuesta', 'emparejamientos'],
      order: { id_pregunta: 'ASC' },
    });

    const bloques = await this.bloqueRepo.find({
      where: {
        evaluacion: { id_evaluacion: intento.evaluacion.id_evaluacion } as any,
      },
      relations: [
        'tipo',
        'preguntas',
        'preguntas.tipo',
        'preguntas.opcionesRespuesta',
        'preguntas.emparejamientos',
      ],
      order: { id_bloque: 'ASC' },
    });

    // Sanitizar: ocultar es_correcta y la respuesta_esperada
    const mapPregunta = (p: any) => ({
      id_pregunta: p.id_pregunta,
      texto: p.texto,
      puntaje: Number(p.puntaje),
      url_multimedia: p.url_multimedia,
      auto_calificable: p.auto_calificable,
      tipo: p.tipo,
      opcionesRespuesta: (p.opcionesRespuesta ?? []).map((o: any) => ({
        id_opcion: o.id_opcion,
        texto: o.texto,
      })),
      emparejamientos: (p.emparejamientos ?? []).map((e: any) => ({
        id_emparejamiento: e.id_emparejamiento,
        izquierda: e.izquierda,
        derecha: e.derecha,
      })),
      // NO enviar: respuesta_esperada, es_correcta
    });

    return {
      evaluacion: {
        id_evaluacion: intento.evaluacion.id_evaluacion,
        titulo: intento.evaluacion.titulo,
        tiene_tiempo: intento.evaluacion.tiene_tiempo,
        minutos: intento.evaluacion.minutos,

        // ✅ NUEVO: flags de seguridad
        usa_camara: !!intento.evaluacion.usa_camara,
        valida_fraude: !!intento.evaluacion.valida_fraude,

        // ✅ opcional pero útil para el front
        id_curso: intento.evaluacion.curso?.id_curso ?? null,
      },
      intento: {
        id_intento: intento.id_intento,
        inicio: intento.inicio,
        fin_programado: intento.fin_programado,
        estado: intento.estado,
      },
      preguntas_sueltas: sueltas.map(mapPregunta),
      bloques: bloques.map((b: any) => ({
        id_bloque: b.id_bloque,
        tipo: b.tipo,
        enunciado: b.enunciado,
        texto_base: b.texto_base,
        url_audio: b.url_audio,
        preguntas: (b.preguntas ?? []).map(mapPregunta),
      })),
    };
  }

  // ========= Helpers autocalificación =========
  private normalizeExpected(s: string) {
    return (s ?? '').toString().trim().toLowerCase();
  }

  private async autocalificar(pregunta: Pregunta, dto: GuardarRespuestaDto) {
    const codigo = pregunta.tipo?.codigo;

    // MULTIPLE_CHOICE
    if (codigo === TipoPreguntaCodigo.MULTIPLE_CHOICE) {
      const id_opcion = dto.id_opcion ?? null;
      if (!id_opcion) return { auto: true, ok: false, puntaje: 0 };

      const opcion = await this.opcionRepo.findOne({
        where: {
          id_opcion,
          pregunta: { id_pregunta: pregunta.id_pregunta } as any,
        },
      });
      if (!opcion) return { auto: true, ok: false, puntaje: 0 };

      const ok = !!opcion.es_correcta;
      const puntaje = ok ? Number(pregunta.puntaje) : 0;
      return { auto: true, ok, puntaje };
    }

    // MATCHING: comparar pares seleccionados contra los emparejamientos reales
    if (codigo === TipoPreguntaCodigo.MATCHING) {
      const seleccion = dto.respuesta_matching ?? null;

      const reales = await this.empRepo.find({
        where: { pregunta: { id_pregunta: pregunta.id_pregunta } as any },
        select: ['izquierda', 'derecha'],
      });

      if (!reales.length) return { auto: true, ok: false, puntaje: 0 };
      if (!Array.isArray(seleccion) || seleccion.length !== reales.length)
        return { auto: true, ok: false, puntaje: 0 };

      const setReal = new Set(
        reales.map(
          (p) =>
            `${this.normalizeExpected(p.izquierda)}=>${this.normalizeExpected(p.derecha)}`,
        ),
      );
      const setSel = new Set(
        seleccion.map(
          (p) =>
            `${this.normalizeExpected(p.izquierda)}=>${this.normalizeExpected(p.derecha)}`,
        ),
      );

      const ok =
        setReal.size === setSel.size &&
        [...setReal].every((x) => setSel.has(x));
      const puntaje = ok ? Number(pregunta.puntaje) : 0;
      return { auto: true, ok, puntaje };
    }

    // WRITING: si tiene respuesta_esperada, comparar normalizado exacto (simple)
    if (codigo === TipoPreguntaCodigo.WRITING) {
      if (!pregunta.auto_calificable || !pregunta.respuesta_esperada) {
        return { auto: false, ok: false, puntaje: 0 }; // requiere revisión
      }
      const resp = this.normalizeExpected(dto.respuesta_texto ?? '');
      const ok =
        resp.length > 0 &&
        resp === this.normalizeExpected(pregunta.respuesta_esperada);
      const puntaje = ok ? Number(pregunta.puntaje) : 0;
      return { auto: true, ok, puntaje };
    }

    // SPEAKING / otros: manual
    return { auto: false, ok: false, puntaje: 0 };
  }

  // ========= 4) Autosave por pregunta =========
  async autosaveRespuesta(
    id_intento: number,
    id_pregunta: number,
    dto: GuardarRespuestaDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    // si ya expiró, marcamos y bloqueamos
    if (intento.estado !== IntentoEstado.EN_PROGRESO) {
      throw new ForbiddenException('El intento ya no está en progreso');
    }
    if (
      intento.fin_programado &&
      new Date() > new Date(intento.fin_programado)
    ) {
      await this.marcarExpirado(intento.id_intento);
      throw new ForbiddenException('Tiempo agotado');
    }

    // validar que la pregunta pertenece a esa evaluación (suelta o dentro de bloque de esa evaluación)
    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: ['tipo', 'evaluacion', 'bloque', 'bloque.evaluacion'],
    });
    if (!pregunta) throw new NotFoundException('Pregunta no encontrada');

    const idEval = intento.evaluacion.id_evaluacion;

    const pertenece =
      (pregunta.evaluacion?.id_evaluacion === idEval && !pregunta.bloque) ||
      pregunta.bloque?.evaluacion?.id_evaluacion === idEval;

    if (!pertenece)
      throw new ForbiddenException('Pregunta no pertenece a esta evaluación');

    // upsert respuesta
    return this.dataSource.transaction(async (manager) => {
      const respRepo = manager.getRepository(RespuestaIntento);

      let resp = await respRepo.findOne({
        where: {
          intento: { id_intento } as any,
          pregunta: { id_pregunta } as any,
        },
        relations: ['opcion_seleccionada'],
      });

      if (!resp) {
        resp = respRepo.create({
          intento: { id_intento } as any,
          pregunta: { id_pregunta } as any,
          respuesta_texto: null,
          opcion_seleccionada: null,
          respuesta_matching: null,
          url_audio: null,
          auto_calificada: false,
          es_correcta: false,
          puntaje_obtenido: 0,
          revisada: false,
        });
      }

      // set campos según dto (solo lo que venga)
      if (dto.respuesta_texto !== undefined)
        resp.respuesta_texto = dto.respuesta_texto ?? null;
      if (dto.url_audio !== undefined) resp.url_audio = dto.url_audio ?? null;
      if (dto.respuesta_matching !== undefined)
        resp.respuesta_matching = dto.respuesta_matching ?? null;

      if (dto.id_opcion !== undefined) {
        if (dto.id_opcion === null) {
          resp.opcion_seleccionada = null;
        } else {
          resp.opcion_seleccionada = { id_opcion: dto.id_opcion } as any;
        }
      }

      // autocalificar si aplica
      const calc = await this.autocalificar(pregunta, dto);
      if (calc.auto) {
        resp.auto_calificada = true;
        resp.es_correcta = calc.ok;
        resp.puntaje_obtenido = this.round2(calc.puntaje);
        // si no auto, lo dejamos para revisión
      } else {
        resp.auto_calificada = false;
        resp.es_correcta = false;
        resp.puntaje_obtenido = 0;
      }

      const saved = await respRepo.save(resp);

      return {
        ok: true,
        id_respuesta: saved.id_respuesta,
        id_pregunta,
        auto_calificada: saved.auto_calificada,
        es_correcta: saved.es_correcta,
        puntaje_obtenido: Number(saved.puntaje_obtenido),
        updated_at: saved.updated_at,
      };
    });
  }

  private async marcarExpirado(id_intento: number) {
    await this.intentoRepo.update(
      { id_intento },
      { estado: IntentoEstado.EXPIRADO, fin_real: new Date() },
    );
  }

  // ========= 5) Finalizar =========
  async finalizarIntento(id_intento: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    if (intento.estado !== IntentoEstado.EN_PROGRESO) {
      return { ok: true, estado: intento.estado }; // idempotente
    }

    // si se pasó el tiempo
    if (
      intento.fin_programado &&
      new Date() > new Date(intento.fin_programado)
    ) {
      await this.marcarExpirado(id_intento);
      return { ok: true, estado: IntentoEstado.EXPIRADO };
    }

    const idEval = intento.evaluacion.id_evaluacion;

    // =========================================================
    // 1) Traer TODAS las preguntas de la evaluación (sueltas + subpreguntas)
    // =========================================================

    // sueltas
    const preguntasSueltas = await this.preguntaRepo.find({
      where: {
        evaluacion: { id_evaluacion: idEval } as any,
        bloque: null as any,
      },
      relations: ['tipo'],
      select: ['id_pregunta', 'puntaje', 'auto_calificable'],
      order: { id_pregunta: 'ASC' },
    });

    // subpreguntas (pertenecen a bloques de esa evaluación)
    const preguntasSub = await this.preguntaRepo
      .createQueryBuilder('p')
      .innerJoin('p.bloque', 'b')
      .innerJoinAndSelect('p.tipo', 't')
      .where('b.id_evaluacion = :idEval', { idEval })
      .orderBy('p.id_pregunta', 'ASC')
      .getMany();

    const todasLasPreguntas = [...preguntasSueltas, ...preguntasSub];

    // =========================================================
    // 2) Traer respuestas guardadas del intento
    // =========================================================
    const respuestas = await this.respRepo.find({
      where: { intento: { id_intento } as any },
      relations: ['pregunta', 'pregunta.tipo'],
    });

    // map: id_pregunta -> puntaje_obtenido
    const puntajePorPregunta = new Map<number, number>();
    for (const resp of respuestas) {
      puntajePorPregunta.set(
        resp.pregunta.id_pregunta,
        Number(resp.puntaje_obtenido ?? 0),
      );
    }

    // =========================================================
    // 3) Sumar puntajes: si NO hay respuesta => 0
    // =========================================================
    const puntaje_total = this.round2(
      todasLasPreguntas.reduce((acc, p) => {
        const v = puntajePorPregunta.get(p.id_pregunta) ?? 0;
        return acc + Number(v);
      }, 0),
    );

    const calificacion = puntaje_total;

    // =========================================================
    // 4) Pendiente de revisión:
    //    true SOLO si el estudiante RESPONDIÓ una pregunta manual (no auto_calificable)
    // =========================================================
    const manualPendiente = respuestas.some((resp) => {
      // manual = no auto_calificable (ej: SPEAKING, WRITING sin respuesta_esperada)
      // y además que haya algo respondido (texto/audio/matching/opción)
      const p = resp.pregunta;
      const respondioAlgo =
        !!resp.respuesta_texto ||
        !!resp.url_audio ||
        !!resp.opcion_seleccionada ||
        (resp.respuesta_matching &&
          Array.isArray(resp.respuesta_matching) &&
          resp.respuesta_matching.length > 0);

      return !p.auto_calificable && respondioAlgo;
    });

    await this.intentoRepo.update(
      { id_intento },
      {
        estado: IntentoEstado.ENTREGADO,
        fin_real: new Date(),
        puntaje_total,
        calificacion,
        pendiente_revision: manualPendiente,
      },
    );

    return {
      ok: true,
      estado: IntentoEstado.ENTREGADO,
      puntaje_total,
      calificacion,
      pendiente_revision: manualPendiente,
    };
  }

  // ========= 6) Resultado =========
  async verResultado(id_intento: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    return {
      id_intento: intento.id_intento,
      estado: intento.estado,
      puntaje_total: Number(intento.puntaje_total),
      calificacion: Number(intento.calificacion),
      pendiente_revision: intento.pendiente_revision,
      inicio: intento.inicio,
      fin_programado: intento.fin_programado,
      fin_real: intento.fin_real,
    };
  }

  //detalle del intento para revisar:
  async obtenerIntentoParaRevision(
    id_intento: number,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
    }

    await this.assertEsMejorIntento(id_intento);

    const idEval = intento.evaluacion.id_evaluacion;

    const sueltas = await this.preguntaRepo.find({
      where: {
        evaluacion: { id_evaluacion: idEval } as any,
        bloque: null as any,
      },
      relations: ['tipo', 'opcionesRespuesta', 'emparejamientos'],
      order: { id_pregunta: 'ASC' },
    });

    const bloques = await this.bloqueRepo.find({
      where: { evaluacion: { id_evaluacion: idEval } as any },
      relations: [
        'tipo',
        'preguntas',
        'preguntas.tipo',
        'preguntas.opcionesRespuesta',
        'preguntas.emparejamientos',
      ],
      order: { id_bloque: 'ASC' },
    });

    const respuestas = await this.respRepo.find({
      where: { intento: { id_intento } as any },
      relations: ['pregunta', 'pregunta.tipo', 'opcion_seleccionada'],
    });

    const respMap = new Map<number, RespuestaIntento>();
    for (const resp of respuestas) respMap.set(resp.pregunta.id_pregunta, resp);
    const mapPregunta = (p: any) => {
      const resp = respMap.get(p.id_pregunta);

      return {
        id_pregunta: p.id_pregunta,
        texto: p.texto,
        puntaje: Number(p.puntaje),
        auto_calificable: p.auto_calificable,
        tipo: p.tipo,

        // ✅ MEDIA de la pregunta (para que el docente también la vea)
        url_multimedia: p.url_multimedia ?? null,

        // docente puede ver esta referencia
        respuesta_esperada: p.respuesta_esperada ?? null,

        opcionesRespuesta: (p.opcionesRespuesta ?? []).map((o: any) => ({
          id_opcion: o.id_opcion,
          texto: o.texto,
          es_correcta: o.es_correcta,
        })),

        emparejamientos: (p.emparejamientos ?? []).map((e: any) => ({
          id_emparejamiento: e.id_emparejamiento,
          izquierda: e.izquierda,
          derecha: e.derecha,
        })),

        respuesta: resp
          ? {
              id_respuesta: resp.id_respuesta,
              respuesta_texto: resp.respuesta_texto,

              // ✅ AUDIO del estudiante (SPEAKING)
              url_audio: resp.url_audio,

              respuesta_matching: resp.respuesta_matching,
              opcion_seleccionada: resp.opcion_seleccionada
                ? { id_opcion: resp.opcion_seleccionada.id_opcion }
                : null,

              auto_calificada: resp.auto_calificada,
              es_correcta: resp.es_correcta,
              puntaje_obtenido: Number(resp.puntaje_obtenido ?? 0),
              revisada: resp.revisada,
            }
          : null,
      };
    };
    return {
      intento: {
        id_intento: intento.id_intento,
        estado: intento.estado,
        pendiente_revision: intento.pendiente_revision,
        puntaje_total: Number(intento.puntaje_total),
        calificacion: Number(intento.calificacion),
        inicio: intento.inicio,
        fin_real: intento.fin_real,
      },
      estudiante: {
        id_usuario: intento.estudiante.id_usuario,
        nombres: intento.estudiante.nombres,
        apellidos: intento.estudiante.apellidos,
        username: intento.estudiante.username,
        email: intento.estudiante.email,
      },
      evaluacion: {
        id_evaluacion: intento.evaluacion.id_evaluacion,
        titulo: intento.evaluacion.titulo,
        activa: intento.evaluacion.activa,
      },
      preguntas_sueltas: sueltas.map(mapPregunta),
      bloques: bloques.map((b: any) => ({
        id_bloque: b.id_bloque,
        tipo: b.tipo,
        enunciado: b.enunciado,
        texto_base: b.texto_base,
        url_audio: b.url_audio,
        preguntas: (b.preguntas ?? []).map(mapPregunta),
      })),
    };
  }

  //Calificar una pregunta manual
  async calificarPreguntaIntento(
    id_intento: number,
    id_pregunta: number,
    dto: CalificarRespuestaDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
    }

    if (intento.estado !== IntentoEstado.ENTREGADO) {
      throw new ForbiddenException('Solo puedes calificar intentos ENTREGADOS');
    }

    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: ['evaluacion', 'bloque', 'bloque.evaluacion'],
    });
    if (!pregunta) throw new NotFoundException('Pregunta no encontrada');

    const idEval = intento.evaluacion.id_evaluacion;

    const pertenece =
      (pregunta.evaluacion?.id_evaluacion === idEval && !pregunta.bloque) ||
      pregunta.bloque?.evaluacion?.id_evaluacion === idEval;

    if (!pertenece) {
      throw new ForbiddenException('Pregunta no pertenece a esta evaluación');
    }

    if (pregunta.auto_calificable) {
      throw new BadRequestException('Esta pregunta es autocalificable');
    }

    // ✅ total preguntas (sueltas + subpreguntas en bloques)
    const totalSueltas = await this.preguntaRepo.count({
      where: {
        evaluacion: { id_evaluacion: idEval } as any,
        bloque: null as any,
      },
    });

    const totalEnBloque = await this.preguntaRepo
      .createQueryBuilder('p')
      .innerJoin('p.bloque', 'b')
      .innerJoin('b.evaluacion', 'e')
      .where('e.id_evaluacion = :idEval', { idEval })
      .andWhere('p.id_bloque IS NOT NULL')
      .getCount();

    const totalPreguntas = totalSueltas + totalEnBloque;

    const peso = totalPreguntas > 0 ? 100 / totalPreguntas : 0;
    const puntajeAuto = dto.es_correcta ? peso : 0;

    return this.dataSource.transaction(async (manager) => {
      const respRepo = manager.getRepository(RespuestaIntento);

      let resp = await respRepo.findOne({
        where: {
          intento: { id_intento } as any,
          pregunta: { id_pregunta } as any,
        },
        relations: ['opcion_seleccionada'],
      });

      // Si no existe respuesta, la creamos (por seguridad)
      if (!resp) {
        resp = respRepo.create({
          intento: { id_intento } as any,
          pregunta: { id_pregunta } as any,
          respuesta_texto: null,
          opcion_seleccionada: null,
          respuesta_matching: null,
          url_audio: null,
          auto_calificada: false,
          es_correcta: false,
          puntaje_obtenido: 0,
          revisada: false,
        });
      }

      // ✅ calificación manual simple
      resp.auto_calificada = false;
      resp.es_correcta = !!dto.es_correcta;

      // ✅ al marcar correcto/incorrecto ya se considera revisada
      resp.revisada = true;

      // ✅ puntaje lo define el sistema (ignora dto.puntaje_obtenido)
      resp.puntaje_obtenido = this.round2(puntajeAuto);

      // comentario opcional (si tu entity lo tiene)
      if (dto.comentario_docente !== undefined) {
        (resp as any).comentario_docente = dto.comentario_docente;
      }

      const saved = await respRepo.save(resp);

      // ✅ al menos ya hubo revisión manual → ya no está pendiente
      await manager.update(
        EvaluacionIntento,
        { id_intento } as any,
        { pendiente_revision: false } as any,
      );

      return {
        ok: true,
        id_respuesta: saved.id_respuesta,
        id_pregunta,
        es_correcta: saved.es_correcta,
        puntaje_obtenido: Number(saved.puntaje_obtenido),
        revisada: saved.revisada,
        updated_at: saved.updated_at,
      };
    });
  }

  //Boton de calificar intento recalcula todo y actualiza el estado de pendiente de reivision
  async calificarIntentoFinal(id_intento: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
    }

    await this.assertEsMejorIntento(id_intento);

    if (intento.estado !== IntentoEstado.ENTREGADO) {
      throw new ForbiddenException('Solo puedes calificar intentos ENTREGADOS');
    }

    const idEval = intento.evaluacion.id_evaluacion;

    // 1) preguntas sueltas
    const preguntasSueltas = await this.preguntaRepo.find({
      where: {
        evaluacion: { id_evaluacion: idEval } as any,
        bloque: null as any,
      },
      select: ['id_pregunta', 'puntaje', 'auto_calificable'],
      order: { id_pregunta: 'ASC' },
    });

    // 2) subpreguntas
    const preguntasSub = await this.preguntaRepo
      .createQueryBuilder('p')
      .innerJoin('p.bloque', 'b')
      .where('b.id_evaluacion = :idEval', { idEval })
      .select(['p.id_pregunta', 'p.puntaje', 'p.auto_calificable'])
      .orderBy('p.id_pregunta', 'ASC')
      .getMany();

    const todas = [...preguntasSueltas, ...preguntasSub];

    // 3) respuestas del intento
    const respuestas = await this.respRepo.find({
      where: { intento: { id_intento } as any },
      relations: ['pregunta', 'opcion_seleccionada'],
    });

    const respMap = new Map<number, RespuestaIntento>();
    for (const resp of respuestas) respMap.set(resp.pregunta.id_pregunta, resp);

    // 4) sumar puntajes (si no hay respuesta => 0)
    const puntaje_total = this.round2(
      todas.reduce((acc, p) => {
        const resp = respMap.get(p.id_pregunta);
        const v = resp ? Number(resp.puntaje_obtenido ?? 0) : 0;
        return acc + v;
      }, 0),
    );

    const calificacion = puntaje_total;

    // 5) pendiente_revision real:
    // true si existe manual respondida y NO revisada
    const pendiente_revision = todas.some((p) => {
      if (p.auto_calificable) return false;

      const resp = respMap.get(p.id_pregunta);
      if (!resp) return false;

      const respondioAlgo =
        !!resp.respuesta_texto ||
        !!resp.url_audio ||
        !!resp.opcion_seleccionada ||
        (Array.isArray(resp.respuesta_matching) &&
          resp.respuesta_matching.length > 0);

      return respondioAlgo && !resp.revisada;
    });

    await this.intentoRepo.update(
      { id_intento },
      {
        puntaje_total,
        calificacion,
        pendiente_revision,
        updated_at: new Date(),
      },
    );

    return {
      ok: true,
      id_intento,
      estudiante: {
        id_usuario: intento.estudiante.id_usuario,
        nombres: intento.estudiante.nombres,
        apellidos: intento.estudiante.apellidos,
      },
      puntaje_total,
      calificacion,
      pendiente_revision,
    };
  }

  async listarMejorIntentoPorEstudiante(
    id_evaluacion: number,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const evaluacion = await this.evalRepo.findOne({
      where: { id_evaluacion },
      relations: ['curso'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(userId, evaluacion.curso.id_curso);
    }

    const rows = await this.intentoRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.estudiante', 'u')
      .where('i.id_evaluacion = :idEval', { idEval: id_evaluacion })
      .andWhere('i.estado = :estado', { estado: IntentoEstado.ENTREGADO })
      .distinctOn(['u.id_usuario'])
      .orderBy('u.id_usuario', 'ASC')
      .addOrderBy('i.puntaje_total', 'DESC')
      .addOrderBy('i.updated_at', 'DESC')
      .getMany();

    return {
      evaluacion: {
        id_evaluacion: evaluacion.id_evaluacion,
        titulo: evaluacion.titulo,
        activa: evaluacion.activa,
      },
      intentos: rows.map((i) => ({
        id_intento: i.id_intento,
        numero_intento: i.numero_intento,
        estado: i.estado,
        pendiente_revision: i.pendiente_revision,
        puntaje_total: Number(i.puntaje_total),
        calificacion: Number(i.calificacion),
        inicio: i.inicio,
        fin_real: i.fin_real,
        updated_at: i.updated_at,
        estudiante: {
          id_usuario: i.estudiante.id_usuario,
          nombres: i.estudiante.nombres,
          apellidos: i.estudiante.apellidos,
          username: i.estudiante.username,
          email: i.estudiante.email,
        },
      })),
    };
  }

  private async assertEsMejorIntento(id_intento: number) {
    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (intento.estado !== IntentoEstado.ENTREGADO) {
      throw new ForbiddenException('El intento no está ENTREGADO');
    }

    const mejor = await this.intentoRepo
      .createQueryBuilder('i')
      .where('i.id_evaluacion = :idEval', {
        idEval: intento.evaluacion.id_evaluacion,
      })
      .andWhere('i.id_estudiante = :idEst', {
        idEst: intento.estudiante.id_usuario,
      })
      .andWhere('i.estado = :estado', { estado: IntentoEstado.ENTREGADO })
      .orderBy('i.puntaje_total', 'DESC')
      .addOrderBy('i.updated_at', 'DESC')
      .getOne();

    if (!mejor || mejor.id_intento !== intento.id_intento) {
      throw new ForbiddenException(
        'Solo se puede revisar/calificar el intento con mayor puntaje',
      );
    }

    return intento;
  }

  async iniciarProctoring(id_intento: number, userId: number, rol: string) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    this.assertIntentoActivo(intento);

    if (!intento.evaluacion.usa_camara) {
      return { ok: true, requerido: false };
    }

    await this.intentoRepo.update({ id_intento }, {
      proctoring_iniciado: true,
      proctoring_inicio_at: new Date(),
    } as any);

    return { ok: true, requerido: true };
  }

  async guardarVideoProctoring(
    id_intento: number,
    dto: ProctoringVideoDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    this.assertIntentoActivo(intento);

    if (
      intento.evaluacion.usa_camara &&
      !(intento as any).proctoring_iniciado
    ) {
      throw new ForbiddenException('Primero inicia la cámara');
    }

    const url = (dto?.url_video ?? '').toString().trim();
    if (!url) throw new BadRequestException('url_video es requerido');

    await this.intentoRepo.update({ id_intento }, {
      proctoring_video_url: url,
    } as any);

    return { ok: true, url_video: url };
  }

  async registrarWarningFraude(
    id_intento: number,
    dto: ProctoringWarnDto,
    userId: number,
    rol: string,
  ) {
    const r = this.normalizeRol(rol);

    const intento = await this.intentoRepo.findOne({
      where: { id_intento },
      relations: ['evaluacion', 'evaluacion.curso', 'estudiante'],
    });
    if (!intento) throw new NotFoundException('Intento no encontrado');

    if (r !== 'ADMIN') {
      await this.assertPerteneceCurso(
        userId,
        intento.evaluacion.curso.id_curso,
      );
      if (r === 'ESTUDIANTE' && intento.estudiante.id_usuario !== userId) {
        throw new ForbiddenException('No autorizado');
      }
    }

    this.assertIntentoActivo(intento);

    // ✅ Solo aplica si la evaluación requiere antifraude o cámara
    if (!intento.evaluacion.valida_fraude && !intento.evaluacion.usa_camara) {
      return {
        ok: true,
        ignorado: true,
        warnings: Number((intento as any).fraude_warnings ?? 0),
      };
    }

    const current = Number((intento as any).fraude_warnings ?? 0);
    const next = current + 1;

    const debeSuspender = next >= 3;

    const motivo =
      (dto?.motivo ?? 'FRAUDE').toString().trim().slice(0, 40) || 'FRAUDE';

    await this.intentoRepo.update({ id_intento }, {
      fraude_warnings: next,

      // ✅ nombres reales en tu entity
      suspendido_por_fraude: debeSuspender,
      ultimo_motivo_fraude: debeSuspender
        ? motivo
        : ((intento as any).ultimo_motivo_fraude ?? null),

      // ✅ si toca suspender, también cambiamos el estado
      estado: debeSuspender ? IntentoEstado.SUSPENDIDO : intento.estado,
      fin_real: debeSuspender ? new Date() : intento.fin_real,
      updated_at: new Date(),
    } as any);

    return {
      ok: true,
      warnings: next,
      suspendido: debeSuspender,
    };
  }
}
