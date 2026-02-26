import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('entidades')
export class Entidad {
  @PrimaryGeneratedColumn()
  id_entidad!: number;

  @Column({ unique: true })
  ruc!: string;

  @Column()
  nombre_comercial!: string;

  @Column()
  razon_social!: string;

  @Column()
  direccion!: string;

  @Column({ type: 'text', nullable: true })
  imagen_logo!: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_registro!: Date;

  @Column({ default: true })
  activo!: boolean;
}
