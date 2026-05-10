import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getGallery(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.galleryService.findAll(pageNum, limitNum, category, req.user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getGalleryItem(@Req() req: any, @Param('id') id: string) {
    return this.galleryService.findOne(id, req.user?.id);
  }

  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard)
  async unlockGalleryItem(@Req() req: any, @Param('id') id: string) {
    return this.galleryService.unlock(id, req.user.id);
  }
}
