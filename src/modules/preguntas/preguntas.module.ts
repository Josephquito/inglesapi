import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TipoPregunta } from './entities/tipo-pregunta.entity';
import { Pregunta } from './entities/pregunta.entity';
import { OpcionRespuesta } from './entities/opcion-respuesta.entity';
import { Emparejamiento } from './entities/emparejamiento.entity';
import { BloquePregunta } from './entities/bloque-pregunta.entity';

import { TipoPreguntaService } from './tipo-pregunta.service';
import { PreguntaService } from './preguntas.service';
import { BloquePreguntaService } from './bloques.service';

import { TipoPreguntaController } from './tipo-pregunta.controller';
import { PreguntasController } from './preguntas.controller';
import { BloquesController } from './bloques.controller';

import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoPregunta,
      Pregunta,
      OpcionRespuesta,
      Emparejamiento,
      BloquePregunta,
      Evaluacion,
      CursoUsuario,
    ]),
  ],
  controllers: [TipoPreguntaController, PreguntasController, BloquesController],
  providers: [TipoPreguntaService, PreguntaService, BloquePreguntaService],
  exports: [TipoPreguntaService, PreguntaService, BloquePreguntaService],
})
export class PreguntasModule {}
