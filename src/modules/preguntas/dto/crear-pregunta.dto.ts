import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OpcionDto {
  @IsString() texto: string;
  @IsOptional() @IsBoolean() es_correcta?: boolean;
}

class ParDto {
  @IsString() izquierda: string;
  @IsString() derecha: string;
}

export class CrearPreguntaDto {
  @IsInt()
  id_tipo_pregunta: number;

  @IsString()
  texto: string;

  @IsOptional()
  @IsNumber()
  puntaje?: number;

  @IsOptional()
  @IsString()
  url_multimedia?: string | null;

  // WRITING opcional
  @IsOptional()
  @IsString()
  respuesta_esperada?: string | null;

  // MULTIPLE_CHOICE
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opcionesRespuesta?: OpcionDto[];

  // MATCHING
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParDto)
  emparejamientos?: ParDto[];
}
