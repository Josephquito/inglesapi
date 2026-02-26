import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from './entities/usuario.entity';
import { Estado } from 'src/entities/estado.entity';
import { Entidad } from '../entidades/entities/entidad.entity'; // 👈 ajusta ruta real
import { Rol } from '../roles/entities/rol.entity'; // 👈 ajusta ruta real

import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { EditarPerfilDto } from './dto/editar-perfil.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly userRepository: Repository<Usuario>,
    @InjectRepository(Estado)
    private readonly estadoRepository: Repository<Estado>,
    @InjectRepository(Entidad)
    private readonly entidadRepository: Repository<Entidad>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async verificarIdentificacionDisponible(
    identificacion: string,
    idEntidad: number,
  ): Promise<boolean> {
    const existe = await this.userRepository.findOne({
      where: { identificacion, entidad: { id_entidad: idEntidad } },
    });
    return !existe;
  }

  async listarTodos(): Promise<Usuario[]> {
    return this.userRepository.find({
      relations: ['entidad', 'rol', 'estado'],
      order: { nombres: 'ASC' },
    });
  }

  async listarPorEntidad(id_entidad: number): Promise<Usuario[]> {
    return this.userRepository.find({
      where: { entidad: { id_entidad } },
      relations: ['entidad', 'rol', 'estado'],
      order: { nombres: 'ASC' },
    });
  }

  async cambiarPassword(
    idUsuario: number,
    dto: CambiarPasswordDto,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.userRepository.findOne({
      where: { id_usuario: idUsuario },
      select: ['id_usuario', 'password'],
      relations: ['estado'],
    });

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const esValida = await bcrypt.compare(dto.passwordActual, usuario.password);
    if (!esValida) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const esIgual = await bcrypt.compare(dto.nuevaPassword, usuario.password);
    if (esIgual) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    const nuevaPasswordHash = await bcrypt.hash(dto.nuevaPassword, 10);

    const estadoActivo = await this.estadoRepository.findOne({
      where: [{ codigo: 'A' }, { id_estado: 1 }],
    });
    if (!estadoActivo) {
      throw new BadRequestException('Estado activo no encontrado');
    }

    await this.userRepository.update(idUsuario, {
      password: nuevaPasswordHash,
      estado: estadoActivo,
    });

    return { mensaje: 'Contraseña actualizada exitosamente.' };
  }

  /**
   * UPDATE SENCILLO (ADMIN)
   * - Actualiza solo lo que venga en el DTO
   * - Valida existencia de entidad/rol/estado si se mandan
   * - Hashea password si viene
   * - SIN reglas extra (username único, username != identificación, etc.)
   */
  async actualizarPerfil(id: number, dto: EditarPerfilDto) {
    const usuario = await this.userRepository.findOne({
      where: { id_usuario: id },
      relations: ['entidad', 'rol', 'estado'],
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Campos simples
    if (dto.identificacion !== undefined)
      usuario.identificacion = dto.identificacion;

    if (dto.nombres !== undefined) usuario.nombres = dto.nombres;
    if (dto.apellidos !== undefined) usuario.apellidos = dto.apellidos;
    if (dto.email !== undefined) usuario.email = dto.email;
    if (dto.username !== undefined) usuario.username = dto.username;

    // Relaciones: Entidad
    if (dto.id_entidad !== undefined) {
      const entidad = await this.entidadRepository.findOne({
        where: { id_entidad: dto.id_entidad },
      });
      if (!entidad) throw new BadRequestException('Entidad no encontrada');
      usuario.entidad = entidad;
    }

    // Relaciones: Rol
    if (dto.rol !== undefined) {
      const rol = await this.rolRepository.findOne({
        where: { id_rol: dto.rol },
      });
      if (!rol) throw new BadRequestException('Rol no encontrado');
      usuario.rol = rol;
    }

    // Relaciones: Estado
    if (dto.estado_codigo !== undefined) {
      const estado = await this.estadoRepository.findOne({
        where: { codigo: dto.estado_codigo },
      });
      if (!estado) throw new BadRequestException('Estado inválido');
      usuario.estado = estado;
    }

    // Password (si admin la manda)
    if (dto.password !== undefined) {
      usuario.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepository.save(usuario);
    return { mensaje: 'Usuario actualizado exitosamente' };
  }

  async verificarUsernameDisponible(
    username: string,
    idUsuario: number,
    idEntidad: number,
  ) {
    const existente = await this.userRepository.findOne({
      where: {
        username,
        id_usuario: Not(idUsuario),
        entidad: { id_entidad: idEntidad },
      },
    });
    return !existente;
  }

  async getProfile(userId: number) {
    const usuario = await this.userRepository.findOne({
      where: { id_usuario: userId },
      relations: ['entidad', 'estado', 'rol'],
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (['B', 'E'].includes(usuario.estado?.codigo)) {
      throw new UnauthorizedException(
        'El acceso está restringido por el estado de la cuenta',
      );
    }

    const requiereCambioContrasena = usuario.estado?.codigo === 'X';

    return {
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      identificacion: usuario.identificacion,
      fecha_registro: usuario.fecha_registro,
      rol: usuario.rol,
      entidad: usuario.entidad,
      estado: usuario.estado,
      requiereCambioContrasena,
    };
  }
}
