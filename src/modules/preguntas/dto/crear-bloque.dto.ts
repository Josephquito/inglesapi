import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CrearBloqueDto {
  @IsInt()
  id_tipo_pregunta: number; // LISTENING / READING

  @IsString()
  enunciado: string;

  @IsOptional()
  @IsString()
  texto_base?: string | null; // READING

  @IsOptional()
  @IsString()
  url_audio?: string | null; // LISTENING
}
