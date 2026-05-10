import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GalleryService } from './gallery.service';
import { GalleryItem } from './entities/gallery-item.entity';
import { GalleryUnlock } from './entities/gallery-unlock.entity';
import { ApiKey } from '../auth/entities/api-key.entity';

describe('GalleryService', () => {
  let service: GalleryService;

  const galleryRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const galleryUnlockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const apiKeyRepository = {
    findOne: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        {
          provide: getRepositoryToken(GalleryItem),
          useValue: galleryRepository,
        },
        {
          provide: getRepositoryToken(GalleryUnlock),
          useValue: galleryUnlockRepository,
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<GalleryService>(GalleryService);
  });

  it('匿名访问付费作品详情时，不应查询解锁记录且返回未解锁', async () => {
    galleryRepository.findOne.mockResolvedValue({
      id: 'item-1',
      title: 'Premium Item',
      imageUrl: 'https://example.com/image.png',
      type: 'paid',
      unlockQuota: 5,
      category: '人物',
      isActive: true,
    });

    const result = await service.findOne('item-1');

    expect(galleryUnlockRepository.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'item-1',
      title: 'Premium Item',
      imageUrl: 'https://example.com/image.png',
      type: 'paid',
      unlockQuota: 5,
      category: '人物',
      isUnlocked: false,
    });
  });

  it('匿名访问列表时，不应查询解锁记录，付费作品保持未解锁', async () => {
    const getManyAndCount = jest.fn().mockResolvedValue([
      [
        {
          id: 'paid-1',
          title: 'Premium Item',
          imageUrl: 'https://example.com/image.png',
          type: 'paid',
          unlockQuota: 5,
          category: '人物',
          createdAt: new Date('2026-05-08T00:00:00Z'),
        },
        {
          id: 'free-1',
          title: 'Free Item',
          imageUrl: 'https://example.com/free.png',
          type: 'free',
          unlockQuota: 0,
          category: '风景',
          createdAt: new Date('2026-05-08T00:00:00Z'),
        },
      ],
      2,
    ]);
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount,
    };

    galleryRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll(1, 20, undefined);

    expect(galleryUnlockRepository.find).not.toHaveBeenCalled();
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'paid-1', isUnlocked: false }),
      expect.objectContaining({ id: 'free-1', isUnlocked: true }),
    ]);
  });
});
