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
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
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
      useFactory: (config: ConfigService) => {
        const sslEnabled =
          String(config.get<string>('DB_SSL') ?? '').toLowerCase() === 'true';

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<number>('DB_PORT')),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),

          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,

          synchronize: true, // ⚠️ solo dev

          // ✅ Reintentos cuando se cae el DB / proxy
          retryAttempts: 10,
          retryDelay: 3000,

          // ✅ Pool + keepalive (clave para ECONNRESET/ETIMEDOUT en proxies)
          extra: {
            max: Number(config.get<number>('DB_POOL_MAX') ?? 10), // 5–10 dev, 10–20 prod
            connectionTimeoutMillis: Number(
              config.get<number>('DB_CONN_TIMEOUT_MS') ?? 10000,
            ),
            idleTimeoutMillis: Number(
              config.get<number>('DB_IDLE_TIMEOUT_MS') ?? 30000,
            ),
            keepAlive: true,
          },

          // ✅ SSL (muchos proveedores lo requieren)
          ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),

          // opcional: mejor diagnóstico
          // logging: ['error'],
        };
      },
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
