import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PreguntaService } from './preguntas.service';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreguntasController {
  constructor(private readonly service: PreguntaService) {}

  private getUserId(req: any): number {
    const userId = req.user?.sub ?? req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');
    return Number(userId);
  }

  @Roles('ADMIN', 'DOCENTE')
  @Get('evaluaciones/:id_evaluacion/preguntas')
  listar(
    @Param('id_evaluacion', ParseIntPipe) id_evaluacion: number,
    @Req() req: any,
  ) {
    return this.service.listarPorEvaluacion(
      id_evaluacion,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Post('evaluaciones/:id_evaluacion/preguntas')
  crear(
    @Param('id_evaluacion', ParseIntPipe) id_evaluacion: number,
    @Body() dto: CrearPreguntaDto,
    @Req() req: any,
  ) {
    return this.service.crearEnEvaluacion(
      id_evaluacion,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Put('preguntas/:id_pregunta')
  editar(
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Body() dto: UpdatePreguntaDto,
    @Req() req: any,
  ) {
    return this.service.editarPregunta(
      id_pregunta,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Delete('preguntas/:id_pregunta')
  eliminar(
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Req() req: any,
  ) {
    return this.service.eliminar(
      id_pregunta,
      this.getUserId(req),
      req.user?.rol,
    );
  }
}
