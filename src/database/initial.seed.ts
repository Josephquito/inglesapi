import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Rol } from 'src/modules/roles/entities/rol.entity';
import { Estado } from 'src/entities/estado.entity';
import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';

// ✅ importa tu entity y enum
import {
  TipoPregunta,
  TipoPreguntaCodigo,
} from 'src/modules/preguntas/entities/tipo-pregunta.entity';

export async function runSeed(app: any) {
  const rolRepo: Repository<Rol> = app.get(getRepositoryToken(Rol));
  const estadoRepo: Repository<Estado> = app.get(getRepositoryToken(Estado));
  const usuarioRepo: Repository<Usuario> = app.get(getRepositoryToken(Usuario));
  const entidadRepo: Repository<Entidad> = app.get(getRepositoryToken(Entidad));

  // ✅ repo tipos pregunta
  const tipoPreguntaRepo: Repository<TipoPregunta> = app.get(
    getRepositoryToken(TipoPregunta),
  );

  console.log('🌱 Seed inicial...');

  // ========= ENTIDAD BASE (ID = 1) =========
  let entidad = await entidadRepo.findOne({ where: { ruc: '0107931032001' } });

  if (!entidad) {
    entidad = entidadRepo.create({
      ruc: '0107931032001',
      nombre_comercial: 'Instituto Superior Tecnológico',
      razon_social: 'Instituto Superior Tecnológico',
      direccion: 'Simon Bolivar & Manuel Vega',
      imagen_logo: '',
      activo: true,
    });

    entidad = await entidadRepo.save(entidad);
    console.log('✅ Entidad base creada');
  }

  // ========= ESTADOS =========
  const estados = [
    { codigo: 'A', nombre: 'Activo' },
    { codigo: 'B', nombre: 'Bloqueado' },
    { codigo: 'E', nombre: 'Eliminado' },
    { codigo: 'X', nombre: 'Requiere cambio de contraseña' },
  ];

  for (const e of estados) {
    const existe = await estadoRepo.findOneBy({ codigo: e.codigo });
    if (!existe) {
      await estadoRepo.save(estadoRepo.create(e));
      console.log(`✅ Estado ${e.codigo} creado`);
    }
  }

  // ========= ROLES =========
  const roles = [
    { codigo: 'ADMIN', nombre: 'Administrador' },
    { codigo: 'DOCENTE', nombre: 'Docente' },
    { codigo: 'ESTUDIANTE', nombre: 'Estudiante' },
  ];

  for (const r of roles) {
    const existe = await rolRepo.findOneBy({ codigo: r.codigo });
    if (!existe) {
      await rolRepo.save(rolRepo.create(r));
      console.log(`✅ Rol ${r.codigo} creado`);
    }
  }

  // ========= TIPOS DE PREGUNTA =========
  const tiposPregunta: Partial<TipoPregunta>[] = [
    {
      codigo: TipoPreguntaCodigo.WRITING,
      nombre: 'Redacción',
      activo: true,
      permite_opciones: false,
      requiere_seleccion: false,
      es_bloque: false,
    },
    {
      codigo: TipoPreguntaCodigo.MULTIPLE_CHOICE,
      nombre: 'Opción múltiple',
      activo: true,
      permite_opciones: true,
      requiere_seleccion: true,
      es_bloque: false,
    },
    {
      codigo: TipoPreguntaCodigo.SPEAKING,
      nombre: 'Grabación de voz',
      activo: true,
      permite_opciones: false,
      requiere_seleccion: false,
      es_bloque: false,
    },
    {
      codigo: TipoPreguntaCodigo.LISTENING,
      nombre: 'Comprensión auditiva',
      activo: true,
      permite_opciones: false,
      requiere_seleccion: false,
      es_bloque: true,
    },
    {
      codigo: TipoPreguntaCodigo.MATCHING,
      nombre: 'Unir opciones',
      activo: true,
      permite_opciones: false,
      requiere_seleccion: false,
      es_bloque: false,
    },
    {
      codigo: TipoPreguntaCodigo.READING,
      nombre: 'Comprensión lectora',
      activo: true,
      permite_opciones: false,
      requiere_seleccion: false,
      es_bloque: true,
    },
  ];

  for (const t of tiposPregunta) {
    const existe = await tipoPreguntaRepo.findOne({
      where: { codigo: t.codigo as any },
    });

    if (!existe) {
      await tipoPreguntaRepo.save(tipoPreguntaRepo.create(t));
      console.log(`✅ TipoPregunta ${t.codigo} creado`);
    } else {
      // ✅ opcional: si ya existe, lo “sincroniza” por si cambias flags/nombre
      await tipoPreguntaRepo.update(
        { id_tipo_pregunta: existe.id_tipo_pregunta },
        {
          nombre: t.nombre as any,
          activo: t.activo as any,
          permite_opciones: t.permite_opciones as any,
          requiere_seleccion: t.requiere_seleccion as any,
          es_bloque: t.es_bloque as any,
        },
      );
      console.log(`↻ TipoPregunta ${t.codigo} actualizado`);
    }
  }

  // ========= ADMIN =========
  const adminExistente = await usuarioRepo.findOneBy({ username: 'admin' });

  if (!adminExistente) {
    const rolAdmin = await rolRepo.findOneBy({ codigo: 'ADMIN' });
    const estadoActivo = await estadoRepo.findOneBy({ codigo: 'A' });

    if (!rolAdmin || !estadoActivo) {
      throw new Error('No se encontraron rol ADMIN o estado A');
    }

    const passwordHash = await bcrypt.hash('Admin123*', 10);

    const admin = usuarioRepo.create({
      username: 'admin',
      password: passwordHash,
      nombres: 'Super',
      apellidos: 'Admin',
      email: 'admin@sistema.com',
      identificacion: '0000000000',
      rol: rolAdmin,
      estado: estadoActivo,
      entidad: entidad,
    });

    await usuarioRepo.save(admin);
    console.log('✅ Usuario ADMIN creado');
  }

  console.log('🌱 Seed completado.');
}
