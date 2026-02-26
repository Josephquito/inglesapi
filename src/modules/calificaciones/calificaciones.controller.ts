import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { CalificacionesService } from './calificaciones.service';

@Controller('calificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalificacionesController {
  constructor(private readonly service: CalificacionesService) {}

  private getUserId(req: any): number {
    // Asegúrate de que coincida con la estructura de tu JWT
    return Number(req.user?.sub ?? req.user?.id_usuario);
  }

  private getUserRol(req: any): string {
    // Si tu rol viene como objeto {id, codigo}, usa req.user.rol.codigo
    // Si viene como string, usa req.user.rol
    return typeof req.user?.rol === 'object'
      ? req.user.rol.codigo
      : req.user?.rol;
  }

  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN') // Permitimos todos, el servicio valida el acceso al curso
  @Get('cursos/:id_curso/mis')
  misPorCurso(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Req() req: any,
  ) {
    return this.service.misCalificacionesCurso(
      id_curso,
      this.getUserId(req),
      this.getUserRol(req),
    );
  }

  @Roles('DOCENTE', 'ADMIN')
  @Get('cursos/:id_curso')
  calificacionesCurso(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Req() req: any,
  ) {
    return this.service.calificacionesCurso(
      id_curso,
      this.getUserId(req),
      this.getUserRol(req),
    );
  }
}
