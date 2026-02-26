import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';

@Injectable()
export class RolService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
  ) {}

  async listar(): Promise<Rol[]> {
    return this.rolRepo.find({
      where: { activo: true },
      order: { id_rol: 'ASC' },
    });
  }

  // ✅ nuevo: para cargar selects en el front
  async selectOneMenu(): Promise<{ value: number; label: string }[]> {
    const roles = await this.listar();
    return roles.map((r) => ({
      value: r.id_rol,
      label: r.codigo, // o r.nombre si tienes ese campo
    }));
  }

  async obtenerPorId(id: number): Promise<Rol | null> {
    return this.rolRepo.findOneBy({ id_rol: id });
  }

  async obtenerPorCodigo(codigo: string): Promise<Rol | null> {
    return this.rolRepo.findOne({
      where: { codigo: codigo.toUpperCase(), activo: true },
    });
  }
}
