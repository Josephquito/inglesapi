import { IsNotEmpty, IsOptional, IsNumber, Min, IsInt } from 'class-validator';

export class UsuarioEvaluacionDto {
  @IsNotEmpty()
  @IsInt()
  id_usuario!: number;

  @IsNotEmpty()
  @IsInt()
  id_evaluacion!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  numero_intento_actual?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  calificacion?: number;
}
