import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { StringValue } from 'ms';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { Usuario } from 'src/modules/usuarios/entities/usuario.entity';
import { Rol } from 'src/modules/roles/entities/rol.entity'; // 👈 usa tu ruta real
import { Estado } from 'src/entities/estado.entity';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Usuario, Rol, Estado, Entidad]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule], // si otros módulos firman/verifican tokens
})
export class AuthModule {}
