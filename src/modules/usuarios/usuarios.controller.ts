/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { EditarPerfilDto } from './dto/editar-perfil.dto';

@Controller('auth') // 🔥 importante para que el front NO cambie
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * LISTAR POR ENTIDAD DEL USUARIO LOGUEADO
   */
  @Get('listar')
  @UseGuards(JwtAuthGuard)
  async listar(@Req() req: any): Promise<Usuario[]> {
    const user = req.user;
    if (!user?.id_usuario)
      throw new UnauthorizedException('Usuario no encontrado');

    const entidadId = user.entidadId; // 👈 viene del JwtStrategy
    if (!entidadId) throw new UnauthorizedException('Entidad no identificada');

    return this.usuariosService.listarPorEntidad(entidadId);
  }

  /**
   * LISTAR TODOS (SOLO ADMIN)
   */
  @Get('listar-todos')
  @UseGuards(JwtAuthGuard)
  async listarTodos(@Req() req: any): Promise<Usuario[]> {
    const user = req.user;
    if (!user?.id_usuario)
      throw new UnauthorizedException('Usuario no encontrado');

    if (user.rol !== 'ADMIN') throw new ForbiddenException('No autorizado');

    return this.usuariosService.listarTodos();
  }

  /**
   * LISTAR POR ENTIDAD (SOLO ADMIN)
   */
  @Get('listar-por-entidad/:idEntidad')
  @UseGuards(JwtAuthGuard)
  async listarPorEntidadAdmin(
    @Req() req: any,
    @Param('idEntidad') idEntidad: string,
  ): Promise<Usuario[]> {
    const user = req.user;
    if (!user?.id_usuario)
      throw new UnauthorizedException('Usuario no encontrado');

    if (user.rol !== 'ADMIN') throw new ForbiddenException('No autorizado');

    const entidadIdNum = parseInt(idEntidad, 10);
    if (!entidadIdNum || Number.isNaN(entidadIdNum)) {
      throw new ForbiddenException('Entidad inválida');
    }

    return this.usuariosService.listarPorEntidad(entidadIdNum);
  }

  @Get('verificar-identificacion')
  async verificarIdentificacion(
    @Query('identificacion') identificacion: string,
    @Query('idEntidad') idEntidad: string,
  ) {
    const disponible =
      await this.usuariosService.verificarIdentificacionDisponible(
        identificacion,
        parseInt(idEntidad, 10),
      );
    return { disponible };
  }

  @Get('verificarusername')
  async verificarUsername(
    @Query('username') username: string,
    @Query('idUsuario') idUsuario: string,
    @Query('idEntidad') idEntidad: string,
  ) {
    const disponible = await this.usuariosService.verificarUsernameDisponible(
      username,
      parseInt(idUsuario, 10),
      parseInt(idEntidad, 10),
    );
    return { disponible };
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async getProfile(@Req() req: any) {
    const userId = req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');

    return this.usuariosService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiarpassword')
  async cambiarPassword(@Body() dto: CambiarPasswordDto, @Req() req: any) {
    const userId = req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');

    return this.usuariosService.cambiarPassword(userId, dto);
  }

  @Put('actualizar/:id')
  @UseGuards(JwtAuthGuard)
  async actualizarPerfil(
    @Param('id') id: number,
    @Body() dto: EditarPerfilDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id_usuario;
    if (!userId) throw new UnauthorizedException('Usuario no encontrado');

    // dueño o admin (misma lógica que tenías)
    if (userId !== Number(id) && req.user?.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'No autorizado para actualizar este usuario',
      );
    }

    return this.usuariosService.actualizarPerfil(Number(id), dto);
  }
}
