import { Entidad } from 'src/modules/entidades/entities/entidad.entity';

export class CursoDto {
  nombre: string;
  descripcion?: string;
  entidad: Entidad;
  activo: boolean;
}
