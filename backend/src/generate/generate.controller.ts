import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { GenerateService } from './generate.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('generate')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTask(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.generateService.createTask(req.user, dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.generateService.getHistory(req.user, { limit, offset });
  }

  @Get('assets/:id')
  async getTaskAsset(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.generateService.getTaskAsset(id);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return new StreamableFile(file.buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTaskStatus(@Req() req: any, @Param('id') id: string) {
    return this.generateService.getTaskStatus(id, req.user);
  }
}
