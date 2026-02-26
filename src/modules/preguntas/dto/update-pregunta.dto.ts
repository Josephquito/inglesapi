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

export class UpdatePreguntaDto {
  @IsOptional()
  @IsInt()
  id_tipo_pregunta?: number;

  @IsOptional()
  @IsString()
  texto?: string;

  @IsOptional()
  @IsNumber()
  puntaje?: number;

  @IsOptional()
  @IsString()
  url_multimedia?: string | null;

  @IsOptional()
  @IsString()
  respuesta_esperada?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opcionesRespuesta?: OpcionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParDto)
  emparejamientos?: ParDto[];
}
