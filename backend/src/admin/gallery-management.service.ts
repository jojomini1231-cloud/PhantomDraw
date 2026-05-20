import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryItem } from '../gallery/entities/gallery-item.entity';

@Injectable()
export class GalleryManagementService {
  constructor(
    @InjectRepository(GalleryItem)
    private galleryRepository: Repository<GalleryItem>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const query = this.galleryRepository.createQueryBuilder('gallery');

    if (search) {
      query.where(
        'gallery.title LIKE :search OR gallery.promptZh LIKE :search OR gallery.promptEn LIKE :search OR gallery.id LIKE :search OR gallery.category LIKE :search',
        { search: `%${search}%` },
      );
    }

    query.orderBy('gallery.createdAt', 'DESC');

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Partial<GalleryItem>) {
    const item = this.galleryRepository.create({
      ...data,
      isActive: data.isActive ?? true,
    });
    return this.galleryRepository.save(item);
  }

  async update(id: string, data: Partial<GalleryItem>) {
    const item = await this.galleryRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('画廊项不存在');
    }
    Object.assign(item, data);
    return this.galleryRepository.save(item);
  }

  async toggleStatus(id: string, isActive: boolean) {
    const item = await this.galleryRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('画廊项不存在');
    }
    item.isActive = isActive;
    return this.galleryRepository.save(item);
  }

  async delete(id: string) {
    const result = await this.galleryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('画廊项不存在');
    }
    return { success: true };
  }
}
