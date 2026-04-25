import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('generate')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post()
  async createTask(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.generateService.createTask(req.user, dto);
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return this.generateService.getHistory(req.user);
  }

  @Get(':id')
  async getTaskStatus(@Req() req: any, @Param('id') id: string) {
    return this.generateService.getTaskStatus(id, req.user);
  }
}
