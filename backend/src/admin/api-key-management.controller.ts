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
import { ApiKeyManagementService } from './api-key-management.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Controller('admin/api-keys')
@UseGuards(AdminAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ApiKeyManagementController {
  constructor(private readonly apiKeyService: ApiKeyManagementService) {}

  @Get()
  async getKeys(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.apiKeyService.findAll(pageNum, limitNum, search);
  }

  @Get('export')
  async exportKeys() {
    return this.apiKeyService.getAllForExport();
  }

  @Post()
  async createKey(
    @Body('quota') quota?: number,
    @Body('multiplier') multiplier?: number,
  ) {
    return this.apiKeyService.createKey(quota, multiplier);
  }

  @Put(':id/quota')
  async updateQuota(@Param('id') id: string, @Body('quota') quota: number) {
    return this.apiKeyService.updateQuota(id, quota);
  }

  @Put(':id')
  async updateKey(
    @Param('id') id: string,
    @Body('quota') quota?: number,
    @Body('multiplier') multiplier?: number,
  ) {
    return this.apiKeyService.updateKey(id, { quota, multiplier });
  }

  @Put(':id/multiplier')
  async updateMultiplier(
    @Param('id') id: string,
    @Body('multiplier') multiplier: number,
  ) {
    return this.apiKeyService.updateMultiplier(id, multiplier);
  }

  @Put('batch/multiplier')
  async batchUpdateMultiplier(
    @Body('ids') ids: string[],
    @Body('multiplier') multiplier: number,
  ) {
    return this.apiKeyService.batchUpdateMultiplier(ids, multiplier);
  }

  @Put('global/multiplier')
  async updateAllMultiplier(@Body('multiplier') multiplier: number) {
    return this.apiKeyService.updateAllMultiplier(multiplier);
  }

  @Put(':id/status')
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.apiKeyService.toggleStatus(id, isActive);
  }

  @Delete(':id')
  async deleteKey(@Param('id') id: string) {
    return this.apiKeyService.deleteKey(id);
  }
}
