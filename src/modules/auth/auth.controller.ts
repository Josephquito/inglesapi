import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const usuarioCreador = req.user;

    // DOCENTE: forzar entidad del docente (si tu validate devuelve entidadId)
    if (usuarioCreador?.rol === 'DOCENTE') {
      dto.id_entidad = usuarioCreador.entidadId;
    }

    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
