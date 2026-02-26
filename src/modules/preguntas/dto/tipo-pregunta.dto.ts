import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoPreguntaCodigo } from '../entities/tipo-pregunta.entity';

export class TipoPreguntaDto {
  @IsEnum(TipoPreguntaCodigo)
  codigo: TipoPreguntaCodigo;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  permite_opciones?: boolean;

  @IsOptional()
  @IsBoolean()
  requiere_seleccion?: boolean;

  @IsOptional()
  @IsBoolean()
  es_bloque?: boolean;
}
