import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { GalleryItem } from './entities/gallery-item.entity';
import { GalleryUnlock } from './entities/gallery-unlock.entity';
import { ApiKey } from '../auth/entities/api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GalleryItem, GalleryUnlock, ApiKey])],
  controllers: [GalleryController],
  providers: [GalleryService]
})
export class GalleryModule {}
