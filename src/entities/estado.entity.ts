import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('estados')
export class Estado {
  @PrimaryGeneratedColumn()
  id_estado: number;

  @Column({ length: 5, unique: true })
  codigo: string;

  @Column({ length: 60 })
  nombre: string;
}
