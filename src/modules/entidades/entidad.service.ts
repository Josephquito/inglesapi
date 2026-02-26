import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntidadDto } from 'src/modules/entidades/dto/entidad.dto';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EntidadService {
  constructor(
    @InjectRepository(Entidad)
    private readonly entidadRepo: Repository<Entidad>,
  ) {}

  async crear(dto: EntidadDto): Promise<Entidad> {
    const entidad = this.entidadRepo.create({
      ruc: dto.ruc,
      nombre_comercial: dto.nombre_comercial,
      razon_social: dto.razon_social,
      direccion: dto.direccion,
      imagen_logo: dto.imagen_logo,
      activo: dto.activo ?? true,
    });

    return await this.entidadRepo.save(entidad);
  }

  async listar(): Promise<Entidad[]> {
    return await this.entidadRepo.find();
  }

  async editar(id: number, dto: EntidadDto): Promise<Entidad> {
    const entidad = await this.entidadRepo.findOneBy({ id_entidad: id });
    if (!entidad) {
      throw new NotFoundException('Entidad no encontrada');
    }
    this.entidadRepo.merge(entidad, dto);
    return this.entidadRepo.save(entidad);
  }

  async obtenerPorId(id: number): Promise<Entidad | null> {
    return await this.entidadRepo.findOneBy({ id_entidad: id });
  }
}
