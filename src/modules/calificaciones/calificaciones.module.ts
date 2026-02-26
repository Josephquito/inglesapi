import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService } from './calificaciones.service';

import { Evaluacion } from '../evaluaciones/entities/evaluacion.entity';
import { CursoUsuario } from '../cursos/entities/curso-usuario.entity';
import { EvaluacionIntento } from '../rendiciones/entities/evaluacion-intento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluacion, CursoUsuario, EvaluacionIntento]),
  ],
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
  exports: [CalificacionesService],
})
export class CalificacionesModule {}
