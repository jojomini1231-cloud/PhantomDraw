import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApiKey } from '../auth/entities/api-key.entity';

@Injectable()
export class ApiKeyManagementService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  private normalizeQuota(quota: number) {
    const normalizedQuota = Number(quota);
    if (!Number.isFinite(normalizedQuota) || normalizedQuota < 0) {
      throw new BadRequestException('额度必须大于或等于 0');
    }
    return Math.floor(normalizedQuota);
  }

  private normalizeMultiplier(multiplier: number) {
    const normalizedMultiplier = Number(multiplier);
    if (!Number.isFinite(normalizedMultiplier) || normalizedMultiplier < 1) {
      throw new BadRequestException('倍率必须大于或等于 1');
    }
    return Math.floor(normalizedMultiplier);
  }

  private withDefaultMultiplier<T extends ApiKey>(item: T): T {
    item.multiplier = item.multiplier ?? 10;
    return item;
  }

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
      items: items.map((item) => this.withDefaultMultiplier(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createKey(quota: number = 100, multiplier: number = 10) {
    const key = new ApiKey();
    key.key = 'pd_' + randomUUID().replace(/-/g, '');
    key.quota = this.normalizeQuota(quota);
    key.multiplier = this.normalizeMultiplier(multiplier);
    key.isActive = true;
    return this.apiKeyRepository.save(key);
  }

  async updateQuota(id: string, newQuota: number) {
    return this.updateKey(id, { quota: newQuota });
  }

  async updateKey(id: string, updates: { quota?: number; multiplier?: number }) {
    const key = await this.apiKeyRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException('密钥不存在');
    }

    if (updates.quota !== undefined) {
      key.quota = this.normalizeQuota(updates.quota);
    }

    if (updates.multiplier !== undefined) {
      key.multiplier = this.normalizeMultiplier(updates.multiplier);
    }

    return this.apiKeyRepository.save(key);
  }

  async updateMultiplier(id: string, multiplier: number) {
    return this.updateKey(id, { multiplier });
  }

  async batchUpdateMultiplier(ids: string[], multiplier: number) {
    const normalizedIds = [...new Set((ids || []).filter(Boolean))];
    if (normalizedIds.length === 0) {
      throw new BadRequestException('请先选择要修改的密钥');
    }

    const result = await this.apiKeyRepository.update(
      { id: In(normalizedIds) },
      { multiplier: this.normalizeMultiplier(multiplier) },
    );

    if (!result.affected) {
      throw new NotFoundException('未找到可更新的密钥');
    }

    return { success: true, affected: result.affected };
  }

  async updateAllMultiplier(multiplier: number) {
    const result = await this.apiKeyRepository
      .createQueryBuilder()
      .update(ApiKey)
      .set({ multiplier: this.normalizeMultiplier(multiplier) })
      .execute();

    return { success: true, affected: result.affected ?? 0 };
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
    const items = await this.apiKeyRepository.find({ order: { createdAt: 'DESC' } });
    return items.map((item) => this.withDefaultMultiplier(item));
  }
}
