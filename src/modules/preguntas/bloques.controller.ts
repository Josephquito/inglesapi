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

import { BloquePreguntaService } from './bloques.service';
import { CrearBloqueDto } from './dto/crear-bloque.dto';
import { UpdateBloqueDto } from './dto/update-bloque.dto';
import { CrearPreguntaDto } from './dto/crear-pregunta.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BloquesController {
  constructor(private readonly service: BloquePreguntaService) {}

  private getUserId(req: any): number {
    const userId = req.user?.sub ?? req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');
    return Number(userId);
  }

  @Roles('ADMIN', 'DOCENTE')
  @Post('evaluaciones/:id_evaluacion/bloques')
  crearBloque(
    @Param('id_evaluacion', ParseIntPipe) id_evaluacion: number,
    @Body() dto: CrearBloqueDto,
    @Req() req: any,
  ) {
    return this.service.crearBloque(
      id_evaluacion,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Get('evaluaciones/:id_evaluacion/bloques')
  listarBloques(
    @Param('id_evaluacion', ParseIntPipe) id_evaluacion: number,
    @Req() req: any,
  ) {
    return this.service.listarBloques(
      id_evaluacion,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Put('bloques/:id_bloque')
  editarBloque(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Body() dto: UpdateBloqueDto,
    @Req() req: any,
  ) {
    return this.service.editarBloque(
      id_bloque,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Delete('bloques/:id_bloque')
  eliminarBloque(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Req() req: any,
  ) {
    return this.service.eliminarBloque(
      id_bloque,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  // Subpreguntas
  @Roles('ADMIN', 'DOCENTE')
  @Post('bloques/:id_bloque/preguntas')
  crearSubpregunta(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Body() dto: CrearPreguntaDto,
    @Req() req: any,
  ) {
    return this.service.crearSubpreguntaMC(
      id_bloque,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Get('bloques/:id_bloque/preguntas')
  listarSubpreguntas(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Req() req: any,
  ) {
    return this.service.listarSubpreguntas(
      id_bloque,
      this.getUserId(req),
      req.user?.rol,
    );
  }
  @Roles('ADMIN', 'DOCENTE')
  @Put('bloques/:id_bloque/preguntas/:id_pregunta')
  editarSubpregunta(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Body() dto: UpdatePreguntaDto, // o CrearPreguntaDto si no quieres crear DTO nuevo
    @Req() req: any,
  ) {
    return this.service.editarSubpreguntaMC(
      id_bloque,
      id_pregunta,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('ADMIN', 'DOCENTE')
  @Delete('bloques/:id_bloque/preguntas/:id_pregunta')
  eliminarSubpregunta(
    @Param('id_bloque', ParseIntPipe) id_bloque: number,
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Req() req: any,
  ) {
    return this.service.eliminarSubpregunta(
      id_bloque,
      id_pregunta,
      this.getUserId(req),
      req.user?.rol,
    );
  }
}
