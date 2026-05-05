import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProviderManagementService {
  constructor(
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const query = this.providerRepository.createQueryBuilder('provider');

    if (search) {
      query.where('provider.name LIKE :search OR provider.baseUrl LIKE :search OR provider.model LIKE :search', { search: `%${search}%` });
    }

    query.orderBy('provider.createdAt', 'DESC');
    
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

  async findAllActive() {
    return this.providerRepository.find({ where: { isActive: true } });
  }

  async create(data: Partial<Provider>) {
    const provider = this.providerRepository.create(data);
    return this.providerRepository.save(provider);
  }

  async update(id: string, data: Partial<Provider>) {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('供应商不存在');
    }
    Object.assign(provider, data);
    return this.providerRepository.save(provider);
  }

  async delete(id: string) {
    const result = await this.providerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('供应商不存在');
    }
    return { success: true };
  }
}
