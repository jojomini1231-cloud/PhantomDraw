import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.adminService.login(body.username, body.password);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @UseInterceptors(AuditLogInterceptor)
  @Get('dashboard')
  getDashboard() {
    return { message: '欢迎来到管理控制台！' };
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('superadmin')
  @UseInterceptors(AuditLogInterceptor)
  @Post('settings')
  updateSettings(@Body() body: Record<string, unknown>) {
    return { message: '系统设置更新成功', settings: body };
  }
}
