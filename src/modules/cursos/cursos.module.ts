import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from './entities/curso.entity';
import { CursoUsuario } from 'src/modules/cursos/entities/curso-usuario.entity';
import { CursoController } from 'src/modules/cursos/cursos.controller';
import { CursoService } from 'src/modules/cursos/cursos.service';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';
import { Estado } from 'src/entities/estado.entity';
import { Rol } from '../roles/entities/rol.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Curso,
      Usuario,
      CursoUsuario,
      Entidad,
      Estado,
      Rol,
    ]),
  ],
  controllers: [CursoController],
  providers: [CursoService],
})
export class CursoModule {}
