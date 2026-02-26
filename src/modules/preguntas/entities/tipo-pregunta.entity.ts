import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Pregunta } from './pregunta.entity';
import { BloquePregunta } from './bloque-pregunta.entity';

export enum TipoPreguntaCodigo {
  WRITING = 'WRITING',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  MATCHING = 'MATCHING',
  READING = 'READING',
}

@Entity('tipo_pregunta')
export class TipoPregunta {
  @PrimaryGeneratedColumn({ name: 'id_tipo_pregunta' })
  id_tipo_pregunta: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  codigo: TipoPreguntaCodigo;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  permite_opciones: boolean;

  @Column({ default: false })
  requiere_seleccion: boolean;

  @Column({ default: false })
  es_bloque: boolean;

  @OneToMany(() => Pregunta, (p) => p.tipo)
  preguntas: Pregunta[];

  @OneToMany(() => BloquePregunta, (b) => b.tipo)
  bloques: BloquePregunta[];
}
