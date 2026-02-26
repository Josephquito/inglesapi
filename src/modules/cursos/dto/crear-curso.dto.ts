import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearCursoDto {
  @IsNumber()
  id_entidad: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;

  @IsOptional()
  activo: boolean;
}
