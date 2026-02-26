import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolService } from './rol.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolService: RolService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listar() {
    return this.rolService.listar();
  }

  // ✅ para selects del front (value/label)
  @Get('selectOneMenu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async selectOneMenu() {
    return this.rolService.selectOneMenu();
  }
}
