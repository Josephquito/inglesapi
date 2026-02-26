import { IsInt, IsArray } from 'class-validator';

export class AsignarUsuariosDto {
  @IsInt()
  id_curso: number;

  @IsArray()
  @IsInt({ each: true })
  usuarios: number[]; // solo ids de usuario
}
