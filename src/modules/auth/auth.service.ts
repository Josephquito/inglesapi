import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { instanceToPlain } from 'class-transformer';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { Rol } from 'src/modules/roles/entities/rol.entity';
import { Estado } from 'src/entities/estado.entity';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario)
    private readonly userRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly roleRepository: Repository<Rol>,
    @InjectRepository(Estado)
    private readonly estadoRepository: Repository<Estado>,
    @InjectRepository(Entidad)
    private readonly entidadRepository: Repository<Entidad>,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOneBy({
      username: dto.username,
    });
    if (existingUser) {
      throw new BadRequestException('El nombre de usuario ya está en uso.');
    }

    const rol = await this.roleRepository.findOneBy({ id_rol: dto.rol });
    if (!rol) throw new BadRequestException('Rol no válido.');

    const estado = await this.estadoRepository.findOne({
      where: [{ codigo: 'X' }, { id_estado: 4 }],
    });
    if (!estado) throw new BadRequestException('Estado no válido.');

    const entidad = await this.entidadRepository.findOneBy({
      id_entidad: dto.id_entidad,
    });
    if (!entidad) throw new BadRequestException('Entidad no válida.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const nuevoUsuario = this.userRepository.create({
      username: dto.username,
      password: hashedPassword,
      nombres: dto.nombres,
      email: dto.email,
      apellidos: dto.apellidos,
      identificacion: dto.identificacion,
      rol,
      estado,
      entidad,
    });

    const usuarioGuardado = await this.userRepository.save(nuevoUsuario);

    const plainUser: any = instanceToPlain(usuarioGuardado);
    delete plainUser.password;
    return plainUser;
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
      relations: ['rol', 'estado', 'entidad'],
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }

    if (
      user.estado?.codigo !== 'A' &&
      ['B', 'E'].includes(user.estado?.codigo)
    ) {
      throw new UnauthorizedException({
        message: 'Usuario inactivo',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }

    const requiereCambioContrasena = user.estado?.codigo === 'X';

    const payload = {
      sub: user.id_usuario,
      username: user.username,
      mail: user.email,
      rol: user.rol?.codigo,
      entidadId: user.entidad?.id_entidad,
      requiereCambioContrasena,
    };

    return { access_token: this.jwtService.sign(payload) };
  }
}
