import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoPregunta } from './entities/tipo-pregunta.entity';
import { TipoPreguntaDto } from './dto/tipo-pregunta.dto';

@Injectable()
export class TipoPreguntaService {
  constructor(
    @InjectRepository(TipoPregunta)
    private readonly repo: Repository<TipoPregunta>,
  ) {}

  async crear(dto: TipoPreguntaDto) {
    const entity = this.repo.create({
      codigo: dto.codigo,
      nombre: dto.nombre,
      activo: dto.activo ?? true,
      permite_opciones: dto.permite_opciones ?? false,
      requiere_seleccion: dto.requiere_seleccion ?? false,
      es_bloque: dto.es_bloque ?? false,
    });
    return this.repo.save(entity);
  }

  async listar() {
    return this.repo.find({ order: { id_tipo_pregunta: 'ASC' } });
  }

  async obtenerPorId(id: number) {
    return this.repo.findOne({ where: { id_tipo_pregunta: id } });
  }

  async obtenerPorCodigo(codigo: any) {
    return this.repo.findOne({ where: { codigo } });
  }
}
