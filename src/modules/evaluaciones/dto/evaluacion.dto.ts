import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EvaluacionDto {
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  descripcion?: string;

  @IsOptional()
  fecha_inicio?: Date;

  @IsOptional()
  fecha_fin?: Date;

  @IsBoolean()
  @IsOptional()
  es_calificada?: boolean;

  @IsNumber()
  @IsOptional()
  calificacion?: number;

  @IsNumber()
  @IsOptional()
  calificacion_requerida?: number;

  @IsBoolean()
  @IsOptional()
  tiene_intentos?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  intentos?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  numero_a_mostrar?: number;

  @IsBoolean()
  @IsOptional()
  tiene_tiempo?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  minutos?: number;

  @IsBoolean()
  @IsOptional()
  valida_fraude?: boolean;

  @IsBoolean()
  @IsOptional()
  usa_camara?: boolean;
}
