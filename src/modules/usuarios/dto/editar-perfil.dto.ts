import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class EditarPerfilDto {
  @IsOptional()
  @IsString()
  identificacion?: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'El nombre de usuario solo puede contener letras y números',
  })
  username?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_entidad?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rol?: number;

  // si manejas estado por codigo (A, I, B, X, etc.)
  @IsOptional()
  @IsString()
  estado_codigo?: string;

  // si quieres permitir que admin cambie password aquí (opcional)
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;
}
