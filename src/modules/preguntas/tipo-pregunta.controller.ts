import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoPreguntaService } from './tipo-pregunta.service';
import { TipoPreguntaDto } from './dto/tipo-pregunta.dto';
import { SelectOneMenuDto } from './dto/select-one-menu.dto';

@Controller('tipopregunta')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipoPreguntaController {
  constructor(private readonly service: TipoPreguntaService) {}

  @Post('crear')
  @Roles('ADMIN')
  crear(@Body() dto: TipoPreguntaDto) {
    return this.service.crear(dto);
  }

  @Get('listar')
  @Roles('ADMIN', 'DOCENTE')
  listar() {
    return this.service.listar();
  }

  @Get('selectOneMenu')
  @Roles('ADMIN', 'DOCENTE')
  async selectOneMenu(): Promise<SelectOneMenuDto[]> {
    const tipos = await this.service.listar();
    return tipos.map((t) => ({
      value: t.id_tipo_pregunta,
      label: t.nombre,
      codigo: t.codigo,
      permite_opciones: t.permite_opciones,
      requiere_seleccion: t.requiere_seleccion,
      es_bloque: t.es_bloque,
    }));
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCENTE')
  obtenerPorId(@Param('id') id: string) {
    return this.service.obtenerPorId(Number(id));
  }
}
