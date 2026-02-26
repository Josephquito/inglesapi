import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Usuario)
    private readonly userRepository: Repository<Usuario>,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id_usuario: payload.sub },
      relations: ['rol', 'estado', 'entidad'],
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // si quieres bloquear inactivos desde JWT:
    if (['B', 'E'].includes(user.estado?.codigo)) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // 🔥 user pequeño y usable en controllers
    return {
      id_usuario: user.id_usuario,
      username: user.username,
      rol: user.rol?.codigo, // 'ADMIN' | 'DOCENTE'...
      estado: user.estado?.codigo, // 'A', 'X', etc
      entidadId: user.entidad?.id_entidad,
      // opcional: si tu front usa email/nombres en session
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      identificacion: user.identificacion,
    };
  }
}
