import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CalificarRespuestaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntaje_obtenido?: number;

  @IsBoolean()
  es_correcta: boolean;

  @IsBoolean()
  revisada: boolean;

  @IsOptional()
  @IsString()
  comentario_docente?: string;
}
