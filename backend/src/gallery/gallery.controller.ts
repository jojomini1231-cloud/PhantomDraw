import {
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
import type { Request, Response } from 'express';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getGallery(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.galleryService.findAll(
      pageNum,
      limitNum,
      category,
      req.user?.id,
    );
  }

  @Get('assets/:filename')
  async getGalleryAsset(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.galleryService.getGalleryAsset(filename);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return new StreamableFile(file.buffer);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getGalleryItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.galleryService.findOne(id, req.user?.id);
  }

  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard)
  async unlockGalleryItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.galleryService.unlock(id, req.user!.id);
  }
}
