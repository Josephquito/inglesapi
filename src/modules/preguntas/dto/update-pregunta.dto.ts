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
  @IsOptional() @IsString() texto?: string | null;
  @IsOptional() @IsString() url_imagen?: string | null;
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
  @IsString()
  texto_base?: string | null; // FILL_BLANK: párrafo con los espacios {{blank_N}}

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
