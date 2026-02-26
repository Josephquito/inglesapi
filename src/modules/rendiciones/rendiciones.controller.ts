import {
  Body,
  Controller,
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
import { RendicionesService } from './rendiciones.service';
import { GuardarRespuestaDto } from './dto/guardar-respuesta.dto';
import { CalificarRespuestaDto } from './dto/calificar-respuesta.dto';

// ✅ nuevos DTOs proctoring
import { ProctoringVideoDto } from './dto/proctoring-video.dto';
import { ProctoringWarnDto } from './dto/proctoring-video.dto';

@Controller('rendiciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RendicionesController {
  constructor(private readonly service: RendicionesService) {}

  private getUserId(req: any): number {
    const userId = req.user?.sub ?? req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');
    return Number(userId);
  }

  // =========================
  // 1) Info para modal
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Get('evaluaciones/:id_evaluacion/info-rendir')
  infoRendir(
    @Param('id_evaluacion', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.infoRendir(id, this.getUserId(req), req.user?.rol);
  }

  // =========================
  // 2) Iniciar intento
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Post('evaluaciones/:id_evaluacion/iniciar')
  iniciar(@Param('id_evaluacion', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.iniciarIntento(id, this.getUserId(req), req.user?.rol);
  }

  // =========================
  // 3) Obtener preguntas
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Get('intentos/:id_intento/preguntas')
  preguntas(@Param('id_intento', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.obtenerPreguntasParaRendir(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  // =========================
  // 4) Autosave por pregunta
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Put('intentos/:id_intento/preguntas/:id_pregunta')
  autosave(
    @Param('id_intento', ParseIntPipe) id_intento: number,
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Body() dto: GuardarRespuestaDto,
    @Req() req: any,
  ) {
    return this.service.autosaveRespuesta(
      id_intento,
      id_pregunta,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  // =========================
  // 5) Finalizar intento
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Post('intentos/:id_intento/finalizar')
  finalizar(@Param('id_intento', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.finalizarIntento(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  // =========================
  // 6) Ver resultado
  // =========================
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Get('intentos/:id_intento/resultado')
  resultado(@Param('id_intento', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.verResultado(id, this.getUserId(req), req.user?.rol);
  }

  // ============================================================
  // ✅ PROCTORING (cámara / antifraude)
  // ============================================================

  /**
   * Marca inicio de proctoring (la cámara ya fue concedida en el front)
   * Si tu service exige que la evaluación tenga usa_camara, perfecto.
   */
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Post('intentos/:id_intento/proctoring/iniciar')
  iniciarProctoring(
    @Param('id_intento', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.iniciarProctoring(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  /**
   * Guarda URL del video proctoring (ya subido a Firebase con /uploads)
   */
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Put('intentos/:id_intento/proctoring/video')
  guardarVideoProctoring(
    @Param('id_intento', ParseIntPipe) id: number,
    @Body() dto: ProctoringVideoDto,
    @Req() req: any,
  ) {
    return this.service.guardarVideoProctoring(
      id,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  /**
   * Registra warning de fraude: TAB_SWITCH / WINDOW_BLUR / NO_FACE
   * Cuando llega a 3, el service debe suspender el intento.
   */
  @Roles('ESTUDIANTE', 'ADMIN', 'DOCENTE')
  @Post('intentos/:id_intento/proctoring/warn')
  registrarWarningFraude(
    @Param('id_intento', ParseIntPipe) id: number,
    @Body() dto: ProctoringWarnDto,
    @Req() req: any,
  ) {
    return this.service.registrarWarningFraude(
      id,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  // ============================================================
  // DOCENTE / ADMIN (revisión)
  // ============================================================

  @Roles('DOCENTE', 'ADMIN')
  @Get('intentos/:id_intento/revision')
  detalleRevision(
    @Param('id_intento', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.obtenerIntentoParaRevision(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('DOCENTE', 'ADMIN')
  @Put('intentos/:id_intento/preguntas/:id_pregunta/calificar')
  calificarPregunta(
    @Param('id_intento', ParseIntPipe) id_intento: number,
    @Param('id_pregunta', ParseIntPipe) id_pregunta: number,
    @Body() dto: CalificarRespuestaDto,
    @Req() req: any,
  ) {
    return this.service.calificarPreguntaIntento(
      id_intento,
      id_pregunta,
      dto,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('DOCENTE', 'ADMIN')
  @Post('intentos/:id_intento/calificar')
  calificarIntentoFinal(
    @Param('id_intento', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.calificarIntentoFinal(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }

  @Roles('DOCENTE', 'ADMIN')
  @Get('evaluaciones/:id_evaluacion/intentos-mejor')
  listarMejorIntento(
    @Param('id_evaluacion', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.listarMejorIntentoPorEstudiante(
      id,
      this.getUserId(req),
      req.user?.rol,
    );
  }
}
