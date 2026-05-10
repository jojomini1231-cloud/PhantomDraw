import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryItem } from './entities/gallery-item.entity';
import { GalleryUnlock } from './entities/gallery-unlock.entity';
import { ApiKey } from '../auth/entities/api-key.entity';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryItem)
    private galleryRepository: Repository<GalleryItem>,
    @InjectRepository(GalleryUnlock)
    private galleryUnlockRepository: Repository<GalleryUnlock>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async findAll(page: number = 1, limit: number = 20, category?: string, userId?: string) {
    const query = this.galleryRepository.createQueryBuilder('gallery')
      .select([
        'gallery.id',
        'gallery.title',
        'gallery.imageUrl',
        'gallery.type',
        'gallery.unlockQuota',
        'gallery.category',
        'gallery.createdAt'
      ])
      .where('gallery.isActive = :isActive', { isActive: true });

    if (category && category !== '全部') {
      query.andWhere('gallery.category = :category', { category });
    }

    query.orderBy('gallery.createdAt', 'DESC');

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // If userId is provided, we check which paid items the user has unlocked
    let unlockedItemIds: string[] = [];
    if (userId && items.length > 0) {
      const unlocks = await this.galleryUnlockRepository.find({
        where: { apiKeyId: userId }
      });
      unlockedItemIds = unlocks.map(u => u.galleryItemId);
    }

    const itemsWithUnlockStatus = items.map(item => ({
      ...item,
      isUnlocked: item.type === 'free' || unlockedItemIds.includes(item.id)
    }));

    return {
      items: itemsWithUnlockStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const item = await this.galleryRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException('画廊项不存在');
    }

    const isUnlocked =
      item.type === 'free' ||
      (Boolean(userId) &&
        (await this.galleryUnlockRepository.findOne({
          where: { apiKeyId: userId, galleryItemId: id },
        })));

    if (!isUnlocked) {
      return {
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        type: item.type,
        unlockQuota: item.unlockQuota,
        category: item.category,
        isUnlocked: false
      };
    }

    return {
      ...item,
      isUnlocked: true
    };
  }

  async unlock(id: string, userId: string) {
    const item = await this.galleryRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException('画廊项不存在');
    }

    if (item.type === 'free') {
      throw new BadRequestException('该项目免费，无需解锁');
    }

    const existingUnlock = await this.galleryUnlockRepository.findOne({
      where: { apiKeyId: userId, galleryItemId: id }
    });

    if (existingUnlock) {
      throw new BadRequestException('已解锁过该项目');
    }

    const user = await this.apiKeyRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.quota < item.unlockQuota) {
      throw new BadRequestException('额度不足');
    }

    // Use transaction to ensure data consistency
    await this.apiKeyRepository.manager.transaction(async transactionalEntityManager => {
      user.quota -= item.unlockQuota;
      await transactionalEntityManager.save(user);

      const unlockRecord = this.galleryUnlockRepository.create({
        apiKeyId: userId,
        galleryItemId: id,
        cost: item.unlockQuota,
      });
      await transactionalEntityManager.save(unlockRecord);
    });

    return { success: true, remainingQuota: user.quota };
  }
}
