/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  Put,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { CursoService } from 'src/modules/cursos/cursos.service';
import { CrearCursoDto } from 'src/modules/cursos/dto/crear-curso.dto';
import { AsignarUsuariosDto } from 'src/modules/entidades/dto/asignar-usuarios.dto';
@Controller('cursos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CursoController {
  constructor(private readonly service: CursoService) {}

  // ===== ADMIN: todo lo actual =====

  @Post('crear')
  @Roles('ADMIN')
  async crearCurso(@Body() dto: CrearCursoDto, @Req() req) {
    return this.service.crearCurso(dto);
  }

  // Si tu front admin usa este, lo dejamos igual.
  // (Puedes dejar DOCENTE aquí si lo estabas usando antes)
  @Get('listar')
  @Roles('ADMIN', 'DOCENTE', 'ESTUDIANTE')
  async listarCursos(@Req() req) {
    return this.service.listarCursosPorRol(req.user);
  }

  @Post('asignar-usuarios')
  @Roles('ADMIN')
  async asignarUsuarios(@Body() dto: AsignarUsuariosDto) {
    return this.service.asignarUsuarios(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearCursoDto,
  ) {
    return this.service.actualizar(id, dto);
  }

  @Get('usuarios/:id')
  @Roles('ADMIN', 'DOCENTE', 'ESTUDIANTE')
  async obtenerUsuariosCurso(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerUsuariosCurso(id);
  }

  @Delete('usuarios/:id/:id_usuario')
  @Roles('ADMIN')
  async removerUsuarioCurso(
    @Param('id', ParseIntPipe) id: number,
    @Param('id_usuario', ParseIntPipe) id_usuario: number,
  ) {
    await this.service.removerUsuarioDelCurso(id, id_usuario);
    return { message: 'Usuario removido del curso correctamente' };
  }

  // ===== NUEVO: MIS CURSOS (DOCENTE + ESTUDIANTE) =====

  @Get('mis-cursos')
  @Roles('DOCENTE', 'ESTUDIANTE', 'ADMIN')
  async misCursos(@Req() req) {
    return this.service.listarMisCursos(req.user);
  }

  @Get('mis-cursos/:id')
  @Roles('DOCENTE', 'ESTUDIANTE', 'ADMIN')
  async detalleMiCurso(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.obtenerCursoParaUsuario(id, req.user);
  }

  // Mantén si lo usas en algún lado
  @Get(':id')
  @Roles('ADMIN', 'DOCENTE')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerPorId(id);
  }
}
