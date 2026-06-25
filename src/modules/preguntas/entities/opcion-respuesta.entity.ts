import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity('opciones_respuesta')
export class OpcionRespuesta {
  @PrimaryGeneratedColumn({ name: 'id_opcion' })
  id_opcion: number;

  // ✅ ahora nullable: CHOOSE_IMAGE no necesita texto
  @Column({ type: 'text', nullable: true })
  texto: string | null;

  // ✅ NUEVO: para CHOOSE_IMAGE
  @Column({ type: 'text', nullable: true })
  url_imagen: string | null;

  @Column({ default: false })
  es_correcta: boolean;

  @ManyToOne(() => Pregunta, (p) => p.opcionesRespuesta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_pregunta' })
  pregunta: Pregunta;
}
