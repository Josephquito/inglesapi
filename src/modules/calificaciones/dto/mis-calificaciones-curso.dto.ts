import { CalificacionEstado } from './calificacion-estado.enum';

export type IntentoVisibleDto = {
  id_intento: number;
  numero_intento: number;
  puntaje_total: number;
  calificacion: number;
  pendiente_revision: boolean;
  fin_real: Date | null;
  updated_at: Date;
};

export type EvaluacionConCalificacionDto = {
  id_evaluacion: number;
  titulo: string;
  activa: boolean;
  estado_calificacion: CalificacionEstado;
  intento_visible: IntentoVisibleDto | null;
};

export type MisCalificacionesCursoResponseDto = {
  curso: { id_curso: number };
  evaluaciones: EvaluacionConCalificacionDto[];
};
