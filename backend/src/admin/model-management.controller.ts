import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ModelManagementService } from './model-management.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { ModelConfig } from './entities/model-config.entity';

@Controller('admin/models')
@UseGuards(AdminAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ModelManagementController {
  constructor(private readonly modelService: ModelManagementService) {}

  @Get()
  async getModels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.modelService.findAll(pageNum, limitNum, search);
  }

  @Get('options')
  async getModelOptions() {
    return this.modelService.findAllOptions();
  }

  @Post()
  async createModel(@Body() data: Partial<ModelConfig>) {
    return this.modelService.create(data);
  }

  @Put(':id')
  async updateModel(
    @Param('id') id: string,
    @Body() data: Partial<ModelConfig>,
  ) {
    return this.modelService.update(id, data);
  }

  @Delete(':id')
  async deleteModel(@Param('id') id: string) {
    return this.modelService.delete(id);
  }
}
