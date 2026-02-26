import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RendicionesController } from './rendiciones.controller';
import { RendicionesService } from './rendiciones.service';

import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';
import { Pregunta } from '../preguntas/entities/pregunta.entity';
import { BloquePregunta } from '../preguntas/entities/bloque-pregunta.entity';
import { OpcionRespuesta } from '../preguntas/entities/opcion-respuesta.entity';
import { Emparejamiento } from '../preguntas/entities/emparejamiento.entity';

import { EvaluacionIntento } from './entities/evaluacion-intento.entity';
import { RespuestaIntento } from './entities/respuesta-intento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evaluacion,
      CursoUsuario,
      Pregunta,
      BloquePregunta,
      OpcionRespuesta,
      Emparejamiento,
      EvaluacionIntento,
      RespuestaIntento,
    ]),
  ],
  controllers: [RendicionesController],
  providers: [RendicionesService],
})
export class RendicionesModule {}
