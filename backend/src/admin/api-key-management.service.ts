import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApiKey } from '../auth/entities/api-key.entity';

@Injectable()
export class ApiKeyManagementService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const query = this.apiKeyRepository.createQueryBuilder('apiKey');

    if (search) {
      query.where('apiKey.key LIKE :search OR apiKey.id LIKE :search', { search: `%${search}%` });
    }

    query.orderBy('apiKey.createdAt', 'DESC');
    
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

  async createKey(quota: number = 100) {
    const key = new ApiKey();
    key.key = 'pd_' + randomUUID().replace(/-/g, '');
    key.quota = quota;
    key.isActive = true;
    return this.apiKeyRepository.save(key);
  }

  async updateQuota(id: string, newQuota: number) {
    const key = await this.apiKeyRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException('密钥不存在');
    }
    key.quota = newQuota;
    return this.apiKeyRepository.save(key);
  }

  async toggleStatus(id: string, isActive: boolean) {
    const key = await this.apiKeyRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException('密钥不存在');
    }
    key.isActive = isActive;
    return this.apiKeyRepository.save(key);
  }

  async deleteKey(id: string) {
    const result = await this.apiKeyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('密钥不存在');
    }
    return { success: true };
  }

  async getAllForExport() {
    return this.apiKeyRepository.find({ order: { createdAt: 'DESC' } });
  }
}
