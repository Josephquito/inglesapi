import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Evaluacion } from 'src/modules/evaluaciones/entities/evaluacion.entity';
import { UsuarioEvaluacion } from 'src/modules/evaluaciones/entities/usuario-evaluacion.entity';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { CursoUsuario } from 'src/modules/cursos/entities/curso-usuario.entity';

import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evaluacion,
      UsuarioEvaluacion,
      Usuario,
      CursoUsuario,
    ]),
  ],
  controllers: [EvaluacionController],
  providers: [EvaluacionService],
  exports: [EvaluacionService], // opcional por si luego otros módulos lo usan
})
export class EvaluacionModule {}
