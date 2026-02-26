import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntidadController } from 'src/modules/entidades/entidad.controller';
import { Entidad } from 'src/modules/entidades/entities/entidad.entity';
import { EntidadService } from 'src/modules/entidades/entidad.service';
@Module({
  imports: [TypeOrmModule.forFeature([Entidad])],
  controllers: [EntidadController],
  providers: [EntidadService],
  exports: [EntidadService],
})
export class EntidadModule {}
