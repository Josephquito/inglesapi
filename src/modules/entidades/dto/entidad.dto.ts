import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class EntidadDto {
  @IsString()
  @IsNotEmpty()
  ruc: string;

  @IsString()
  @IsNotEmpty()
  nombre_comercial: string;

  @IsString()
  @IsNotEmpty()
  razon_social: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsOptional()
  imagen_logo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
