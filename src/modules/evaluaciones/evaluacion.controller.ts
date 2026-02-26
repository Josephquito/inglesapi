/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { EvaluacionService } from 'src/modules/evaluaciones/evaluacion.service';
import { EvaluacionDto } from 'src/modules/evaluaciones/dto/evaluacion.dto';

@Controller('evaluaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluacionController {
  constructor(private readonly service: EvaluacionService) {}

  private getUserId(req: any): number {
    const userId = req.user?.sub ?? req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');
    return Number(userId);
  }

  // ===== DOCENTE/Admin: Crear evaluación dentro del curso (queda INACTIVA) =====
  @Roles('ADMIN', 'DOCENTE')
  @Put('curso/:id_curso/crear') // si quieres, mantenla así o cámbiala a POST; dejo PUT por compat si ya usas POST en otro lado
  async crearEnCursoPut(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Body() dto: EvaluacionDto,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.crearEnCurso(id_curso, dto, userId, rol);
  }

  // (recomendado REST)
  @Roles('ADMIN', 'DOCENTE')
  @Put('curso/:id_curso') // si ya tienes rutas ocupadas, cámbiala. Esta es limpia.
  async crearEnCurso(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Body() dto: EvaluacionDto,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.crearEnCurso(id_curso, dto, userId, rol);
  }

  // ===== DOCENTE/Admin: Listar TODAS las evaluaciones del curso =====
  @Roles('ADMIN', 'DOCENTE')
  @Get('curso/:id_curso')
  async listarPorCursoDocente(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.listarPorCursoDocente(id_curso, userId, rol);
  }

  // ===== Estudiante: Listar solo ACTIVAS del curso =====
  @Roles('ADMIN', 'DOCENTE', 'ESTUDIANTE')
  @Get('curso/:id_curso/activas')
  async listarActivasPorCurso(
    @Param('id_curso', ParseIntPipe) id_curso: number,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.listarActivasPorCurso(id_curso, userId, rol);
  }

  // ===== Ver evaluación (según permisos) =====
  @Roles('ADMIN', 'DOCENTE', 'ESTUDIANTE')
  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.obtenerPorIdConAcceso(id, userId, rol);
  }

  // ===== Editar evaluación (docente creador o admin) =====
  @Roles('ADMIN', 'DOCENTE')
  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EvaluacionDto,
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.actualizar(id, dto, userId, rol);
  }

  // ===== Activar / Inactivar =====
  @Roles('ADMIN', 'DOCENTE')
  @Patch(':id/activar')
  async activar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.setActiva(id, true, userId, rol);
  }

  @Roles('ADMIN', 'DOCENTE')
  @Patch(':id/inactivar')
  async inactivar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    return this.service.setActiva(id, false, userId, rol);
  }

  // ===== Borrado físico =====
  @Roles('ADMIN', 'DOCENTE')
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.getUserId(req);
    const rol = req.user?.rol;
    await this.service.eliminarFisico(id, userId, rol);
    return { message: 'Evaluación eliminada correctamente' };
  }
}
