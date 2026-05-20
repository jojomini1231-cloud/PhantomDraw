import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProviderManagementService } from './provider-management.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { Provider } from './entities/provider.entity';

@Controller('admin/providers')
@UseGuards(AdminAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ProviderManagementController {
  constructor(private readonly providerService: ProviderManagementService) {}

  @Get()
  async getProviders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.providerService.findAll(pageNum, limitNum, search);
  }

  @Post()
  async createProvider(@Body() data: Partial<Provider>) {
    return this.providerService.create(data);
  }

  @Put(':id')
  async updateProvider(
    @Param('id') id: string,
    @Body() data: Partial<Provider>,
  ) {
    return this.providerService.update(id, data);
  }

  @Delete(':id')
  async deleteProvider(@Param('id') id: string) {
    return this.providerService.delete(id);
  }
}
