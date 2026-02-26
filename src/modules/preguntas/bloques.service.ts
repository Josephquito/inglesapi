import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BloquePregunta } from './entities/bloque-pregunta.entity';
import {
  TipoPregunta,
  TipoPreguntaCodigo,
} from './entities/tipo-pregunta.entity';
import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { Pregunta } from './entities/pregunta.entity';
import { OpcionRespuesta } from './entities/opcion-respuesta.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';

import { CrearBloqueDto } from './dto/crear-bloque.dto';
import { UpdateBloqueDto } from './dto/update-bloque.dto';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Injectable()
export class BloquePreguntaService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(BloquePregunta)
    private readonly bloqueRepo: Repository<BloquePregunta>,
    @InjectRepository(TipoPregunta)
    private readonly tipoRepo: Repository<TipoPregunta>,
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    @InjectRepository(Pregunta)
    private readonly preguntaRepo: Repository<Pregunta>,
    @InjectRepository(OpcionRespuesta)
    private readonly opcionRepo: Repository<OpcionRespuesta>,
    @InjectRepository(CursoUsuario)
    private readonly cursoUsuarioRepo: Repository<CursoUsuario>,
  ) {}

  private normalizeRol(rol: string): string {
    return (rol ?? '').toString().trim().toUpperCase();
  }

  private round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

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
    if (total <= 0) return { total: 0, puntaje: 0 };

    const puntaje = this.round2(100 / total);

    // sueltas
    await preguntaRepo
      .createQueryBuilder()
      .update(Pregunta)
      .set({ puntaje })
      .where('id_evaluacion = :id_evaluacion', { id_evaluacion })
      .andWhere('id_bloque IS NULL')
      .execute();

    // subpreguntas
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

  private async assertDocenteEnCurso(userId: number, id_curso: number) {
    const asig = await this.cursoUsuarioRepo.findOne({
      where: {
        usuario: { id_usuario: userId } as any,
        curso: { id_curso } as any,
        estado: { codigo: 'A' } as any,
      },
      relations: ['rol', 'estado', 'curso'],
    });
    if (!asig) throw new ForbiddenException('No perteneces a este curso');

    const rolCurso = (asig.rol?.nombre ?? '').toString().trim().toUpperCase();
    if (rolCurso !== 'DOCENTE')
      throw new ForbiddenException('Solo un docente puede gestionar preguntas');
  }

  private async getEvaluacion(id_evaluacion: number) {
    const evaluacion = await this.evaluacionRepo.findOne({
      where: { id_evaluacion },
      relations: ['curso', 'creador'],
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
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
          'No autorizado para gestionar esta evaluación',
        );
      }
      await this.assertDocenteEnCurso(userId, evaluacion.curso.id_curso);
    }

    if (bloquearSiActiva && evaluacion.activa) {
      throw new ForbiddenException(
        'No puedes modificar: la evaluación está activa',
      );
    }

    return evaluacion;
  }

  async crearBloque(
    id_evaluacion: number,
    dto: CrearBloqueDto,
    userId: number,
    rol: string,
  ) {
    await this.assertGestionEvaluacion(id_evaluacion, userId, rol, true);

    const tipo = await this.tipoRepo.findOne({
      where: { id_tipo_pregunta: dto.id_tipo_pregunta },
    });
    if (!tipo) throw new BadRequestException('Tipo inválido');
    if (!tipo.es_bloque)
      throw new BadRequestException('Este tipo no es un bloque');
    if (
      ![TipoPreguntaCodigo.LISTENING, TipoPreguntaCodigo.READING].includes(
        tipo.codigo,
      )
    ) {
      throw new BadRequestException('El bloque debe ser LISTENING o READING');
    }

    if (tipo.codigo === TipoPreguntaCodigo.LISTENING) {
      if (!dto.url_audio)
        throw new BadRequestException('LISTENING requiere url_audio');
    }
    if (tipo.codigo === TipoPreguntaCodigo.READING) {
      if (!dto.texto_base)
        throw new BadRequestException('READING requiere texto_base');
    }

    const bloque = this.bloqueRepo.create({
      enunciado: dto.enunciado,
      texto_base: dto.texto_base ?? null,
      url_audio: dto.url_audio ?? null,
      evaluacion: { id_evaluacion } as any,
      tipo: { id_tipo_pregunta: tipo.id_tipo_pregunta } as any,
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(BloquePregunta).save(bloque);

      // ✅ consistente (aunque aún no haya subpreguntas)
      await this.recalcularPuntajesEvaluacion(id_evaluacion, manager);

      return saved;
    });
  }

  async listarBloques(id_evaluacion: number, userId: number, rol: string) {
    await this.assertGestionEvaluacion(id_evaluacion, userId, rol, false);

    return this.bloqueRepo.find({
      where: { evaluacion: { id_evaluacion } as any },
      relations: ['tipo'],
      order: { id_bloque: 'ASC' }, // ✅ sin orden
    });
  }

  async editarBloque(
    id_bloque: number,
    dto: UpdateBloqueDto,
    userId: number,
    rol: string,
  ) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: [
        'evaluacion',
        'evaluacion.curso',
        'evaluacion.creador',
        'tipo',
      ],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      true,
    );

    const tipoFinalId = dto.id_tipo_pregunta ?? bloque.tipo.id_tipo_pregunta;
    const tipo = await this.tipoRepo.findOne({
      where: { id_tipo_pregunta: tipoFinalId },
    });
    if (!tipo) throw new BadRequestException('Tipo inválido');
    if (!tipo.es_bloque)
      throw new BadRequestException('Este tipo no es un bloque');

    if (dto.enunciado !== undefined) bloque.enunciado = dto.enunciado;
    if (dto.texto_base !== undefined)
      bloque.texto_base = dto.texto_base ?? null;
    if (dto.url_audio !== undefined) bloque.url_audio = dto.url_audio ?? null;

    bloque.tipo = { id_tipo_pregunta: tipo.id_tipo_pregunta } as any;

    if (tipo.codigo === TipoPreguntaCodigo.LISTENING && !bloque.url_audio) {
      throw new BadRequestException('LISTENING requiere url_audio');
    }
    if (tipo.codigo === TipoPreguntaCodigo.READING && !bloque.texto_base) {
      throw new BadRequestException('READING requiere texto_base');
    }

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(BloquePregunta).save(bloque);

      await this.recalcularPuntajesEvaluacion(
        bloque.evaluacion.id_evaluacion,
        manager,
      );

      return saved;
    });
  }

  async eliminarBloque(id_bloque: number, userId: number, rol: string) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: ['evaluacion', 'evaluacion.curso', 'evaluacion.creador'],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      true,
    );

    const idEval = bloque.evaluacion.id_evaluacion;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(BloquePregunta).delete({ id_bloque });

      // ✅ cascada borró subpreguntas => cambia total
      await this.recalcularPuntajesEvaluacion(idEval, manager);
    });

    return { ok: true };
  }

  // Subpregunta MC dentro del bloque (SIN orden)
  async crearSubpreguntaMC(
    id_bloque: number,
    dto: CrearPreguntaDto,
    userId: number,
    rol: string,
  ) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: ['evaluacion', 'evaluacion.curso', 'evaluacion.creador'],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      true,
    );

    const tipoMC = await this.tipoRepo.findOne({
      where: { codigo: TipoPreguntaCodigo.MULTIPLE_CHOICE },
    });
    if (!tipoMC)
      throw new BadRequestException(
        'No existe tipo MULTIPLE_CHOICE (seed requerido)',
      );

    if (!dto.opcionesRespuesta || dto.opcionesRespuesta.length < 2) {
      throw new BadRequestException(
        'La subpregunta debe tener al menos 2 opciones',
      );
    }
    const correctas = dto.opcionesRespuesta.filter(
      (o) => !!o.es_correcta,
    ).length;
    if (tipoMC.requiere_seleccion && correctas < 1) {
      throw new BadRequestException('Marca al menos una opción correcta');
    }

    const idEval = bloque.evaluacion.id_evaluacion;

    return this.dataSource.transaction(async (manager) => {
      const p = manager.getRepository(Pregunta).create({
        texto: dto.texto,
        puntaje: 0, // ✅ calculado por recálculo
        url_multimedia: dto.url_multimedia ?? null,
        respuesta_esperada: null,
        auto_calificable: true,
        evaluacion: null,
        bloque: { id_bloque } as any,
        tipo: { id_tipo_pregunta: tipoMC.id_tipo_pregunta } as any,
      });

      const saved = await manager.getRepository(Pregunta).save(p);

      const ops = dto.opcionesRespuesta!.map((o) =>
        manager.getRepository(OpcionRespuesta).create({
          texto: o.texto,
          es_correcta: !!o.es_correcta,
          pregunta: { id_pregunta: saved.id_pregunta } as any,
        }),
      );
      await manager.getRepository(OpcionRespuesta).save(ops);

      await this.recalcularPuntajesEvaluacion(idEval, manager);

      return manager.getRepository(Pregunta).findOne({
        where: { id_pregunta: saved.id_pregunta },
        relations: ['tipo', 'opcionesRespuesta'],
      });
    });
  }

  async listarSubpreguntas(id_bloque: number, userId: number, rol: string) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: ['evaluacion', 'evaluacion.curso', 'evaluacion.creador'],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      false,
    );

    return this.preguntaRepo.find({
      where: { bloque: { id_bloque } as any },
      relations: ['tipo', 'opcionesRespuesta'],
      order: { id_pregunta: 'ASC' }, // ✅ sin orden
    });
  }
  async editarSubpreguntaMC(
    id_bloque: number,
    id_pregunta: number,
    dto: UpdatePreguntaDto, // o CrearPreguntaDto
    userId: number,
    rol: string,
  ) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: ['evaluacion', 'evaluacion.curso', 'evaluacion.creador'],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      true,
    );

    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: ['bloque', 'tipo', 'opcionesRespuesta'],
    });
    if (!pregunta) throw new NotFoundException('Subpregunta no encontrada');

    if (
      !pregunta.bloque ||
      Number(pregunta.bloque.id_bloque) !== Number(id_bloque)
    ) {
      throw new BadRequestException('La pregunta no pertenece a este bloque');
    }

    const tipoMC = await this.tipoRepo.findOne({
      where: { codigo: TipoPreguntaCodigo.MULTIPLE_CHOICE },
    });
    if (!tipoMC)
      throw new BadRequestException(
        'No existe tipo MULTIPLE_CHOICE (seed requerido)',
      );

    // validaciones MC
    const ops = (dto as any).opcionesRespuesta ?? undefined;
    if (!dto.texto || !dto.texto.trim()) {
      throw new BadRequestException('Escribe el enunciado');
    }
    if (!ops || ops.length < 2) {
      throw new BadRequestException(
        'La subpregunta debe tener al menos 2 opciones',
      );
    }
    const correctas = ops.filter((o: any) => !!o.es_correcta).length;
    if (tipoMC.requiere_seleccion && correctas < 1) {
      throw new BadRequestException('Marca al menos una opción correcta');
    }

    const idEval = bloque.evaluacion.id_evaluacion;

    return this.dataSource.transaction(async (manager) => {
      pregunta.texto = dto.texto ?? pregunta.texto;
      if ((dto as any).url_multimedia !== undefined) {
        pregunta.url_multimedia = (dto as any).url_multimedia ?? null;
      }

      // forzar tipo MC
      pregunta.tipo = { id_tipo_pregunta: tipoMC.id_tipo_pregunta } as any;
      pregunta.respuesta_esperada = null;
      pregunta.auto_calificable = true;

      await manager.getRepository(Pregunta).save(pregunta);

      // reemplazar opciones
      await manager
        .getRepository(OpcionRespuesta)
        .delete({ pregunta: { id_pregunta } as any });

      const newOps = ops.map((o: any) =>
        manager.getRepository(OpcionRespuesta).create({
          texto: o.texto,
          es_correcta: !!o.es_correcta,
          pregunta: { id_pregunta } as any,
        }),
      );
      await manager.getRepository(OpcionRespuesta).save(newOps);

      await this.recalcularPuntajesEvaluacion(idEval, manager);

      return manager.getRepository(Pregunta).findOne({
        where: { id_pregunta },
        relations: ['tipo', 'opcionesRespuesta'],
      });
    });
  }

  async eliminarSubpregunta(
    id_bloque: number,
    id_pregunta: number,
    userId: number,
    rol: string,
  ) {
    const bloque = await this.bloqueRepo.findOne({
      where: { id_bloque },
      relations: ['evaluacion', 'evaluacion.curso', 'evaluacion.creador'],
    });
    if (!bloque) throw new NotFoundException('Bloque no encontrado');

    await this.assertGestionEvaluacion(
      bloque.evaluacion.id_evaluacion,
      userId,
      rol,
      true,
    );

    const pregunta = await this.preguntaRepo.findOne({
      where: { id_pregunta },
      relations: ['bloque'],
    });
    if (!pregunta) throw new NotFoundException('Subpregunta no encontrada');

    if (
      !pregunta.bloque ||
      Number(pregunta.bloque.id_bloque) !== Number(id_bloque)
    ) {
      throw new BadRequestException('La pregunta no pertenece a este bloque');
    }

    const idEval = bloque.evaluacion.id_evaluacion;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Pregunta).delete({ id_pregunta });
      await this.recalcularPuntajesEvaluacion(idEval, manager);
    });

    return { ok: true };
  }
}
