import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GenerationLogService } from './generation-log.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Controller('admin/generation-logs')
@UseGuards(AdminAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class GenerationLogController {
  constructor(private readonly generationLogService: GenerationLogService) {}

  @Get()
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.generationLogService.findAll(pageNum, limitNum, search, status);
  }
}
