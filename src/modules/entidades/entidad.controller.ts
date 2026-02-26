import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Put,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { EntidadService } from 'src/modules/entidades/entidad.service';
import { EntidadDto } from 'src/modules/entidades/dto/entidad.dto';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';

@Controller('entidad')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EntidadController {
  constructor(private readonly service: EntidadService) {}

  @Post('crear')
  crear(@Body() dto: EntidadDto): Promise<Entidad> {
    return this.service.crear(dto);
  }

  @Get('listar')
  listar(): Promise<Entidad[]> {
    return this.service.listar();
  }

  @Get('selectOneMenu')
  async selectOneMenu() {
    const tipos = await this.service.listar();
    return tipos
      .filter((tipo) => tipo.activo)
      .map((tipo) => ({
        value: tipo.id_entidad,
        label: tipo.nombre_comercial,
      }));
  }

  @Put('editar/:id')
  async editar(
    @Param('id') id: number,
    @Body() dto: EntidadDto,
  ): Promise<Entidad> {
    const entidadExistente = await this.service.obtenerPorId(id);
    if (!entidadExistente) {
      throw new NotFoundException('Entidad no encontrada');
    }
    return this.service.editar(id, dto);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: number): Promise<Entidad | null> {
    return this.service.obtenerPorId(id);
  }
}
