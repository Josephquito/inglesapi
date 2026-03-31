import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { EvaluacionModule } from './modules/evaluaciones/evaluacion.module';
import { CursoModule } from './modules/cursos/cursos.module';
import { EntidadModule } from './modules/entidades/entidad.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/rol.module';
import { PreguntasModule } from './modules/preguntas/preguntas.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RendicionesModule } from './modules/rendiciones/rendiciones.module';
import { CalificacionesModule } from './modules/calificaciones/calificaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(), // 👈 reemplaza las 5 DB_ por esta
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: true,
        retryAttempts: 10,
        retryDelay: 3000,
        extra: {
          max: Number(config.get<number>('DB_POOL_MAX') ?? 10),
          connectionTimeoutMillis: Number(
            config.get<number>('DB_CONN_TIMEOUT_MS') ?? 10000,
          ),
          idleTimeoutMillis: Number(
            config.get<number>('DB_IDLE_TIMEOUT_MS') ?? 30000,
          ),
          keepAlive: true,
        },
        ssl: { rejectUnauthorized: false },
      }),
    }),

    // 👇 después los módulos
    AuthModule,
    UsuariosModule,
    EntidadModule,
    EvaluacionModule,
    CursoModule,
    RolesModule,
    PreguntasModule,
    UploadsModule,
    RendicionesModule,
    CalificacionesModule,
  ],
})
export class AppModule {}
