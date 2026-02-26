import { IsInt, IsOptional, IsString, IsArray } from 'class-validator';

export class GuardarRespuestaDto {
  // WRITING
  @IsOptional()
  @IsString()
  respuesta_texto?: string | null;

  // MULTIPLE_CHOICE
  @IsOptional()
  @IsInt()
  id_opcion?: number | null;

  // MATCHING
  @IsOptional()
  @IsArray()
  respuesta_matching?: Array<{ izquierda: string; derecha: string }>;

  // SPEAKING
  @IsOptional()
  @IsString()
  url_audio?: string | null;
}
