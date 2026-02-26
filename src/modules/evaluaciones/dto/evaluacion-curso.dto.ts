import { IsArray, IsInt, IsOptional } from 'class-validator';

export class CrearEvaluacionCursoDto {
  @IsInt()
  id_curso!: number;

  @IsInt()
  id_evaluacion!: number;

  @IsOptional()
  @IsInt()
  id_estado_evaluacion?: number;
}

export class AsignarEvaluacionCursoDto {
  @IsInt()
  id_curso!: number;

  @IsArray()
  @IsInt({ each: true })
  evaluaciones!: number[];
}
