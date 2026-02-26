import { IsString, IsInt, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  identificacion!: string;

  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsInt()
  id_entidad!: number;

  @IsInt()
  rol!: number;

  @IsString()
  username!: string;

  @IsString()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
