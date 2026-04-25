import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { GalleryManagementService } from './gallery-management.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Controller('admin/gallery')
@UseGuards(AdminAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class GalleryManagementController {
  constructor(private readonly galleryService: GalleryManagementService) {}

  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.galleryService.findAll(pageNum, limitNum, search);
  }

  @Post()
  async create(@Body() body: any) {
    return this.galleryService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.galleryService.update(id, body);
  }

  @Put(':id/status')
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.galleryService.toggleStatus(id, isActive);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.galleryService.delete(id);
  }
}
