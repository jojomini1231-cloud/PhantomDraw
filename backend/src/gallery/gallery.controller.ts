import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  async getGallery(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    // req.user from JwtStrategy is the ApiKey entity
    return this.galleryService.findAll(pageNum, limitNum, category, req.user.id);
  }

  @Get(':id')
  async getGalleryItem(@Req() req: any, @Param('id') id: string) {
    return this.galleryService.findOne(id, req.user.id);
  }

  @Post(':id/unlock')
  async unlockGalleryItem(@Req() req: any, @Param('id') id: string) {
    return this.galleryService.unlock(id, req.user.id);
  }
}
