import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBloqueDto {
  @IsOptional()
  @IsInt()
  id_tipo_pregunta?: number;

  @IsOptional()
  @IsString()
  enunciado?: string;

  @IsOptional()
  @IsString()
  texto_base?: string | null;

  @IsOptional()
  @IsString()
  url_audio?: string | null;
}
