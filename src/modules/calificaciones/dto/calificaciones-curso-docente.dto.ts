import { CalificacionEstado } from './calificacion-estado.enum';

export type EvaluacionHeaderDto = {
  id_evaluacion: number;
  titulo: string;
};

export type IntentoVisibleDocenteDto = {
  id_intento: number;
  puntaje_total: number;
  calificacion: number;
  pendiente_revision: boolean;
  updated_at: Date;
};

export type CeldaCalificacionDto = {
  id_evaluacion: number;
  estado_calificacion: CalificacionEstado;
  intento_visible: IntentoVisibleDocenteDto | null;
};

export type EstudianteFilaDto = {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  calificaciones: CeldaCalificacionDto[];
};

export type CalificacionesCursoDocenteResponseDto = {
  curso: { id_curso: number };
  evaluaciones: EvaluacionHeaderDto[];
  estudiantes: EstudianteFilaDto[];
};
