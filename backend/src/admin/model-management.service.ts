import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelConfig } from './entities/model-config.entity';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ModelManagementService implements OnModuleInit {
  private initialModelsPromise?: Promise<void>;

  constructor(
    @InjectRepository(ModelConfig)
    private modelRepository: Repository<ModelConfig>,
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureInitialModels();
    } catch (error) {
      console.error('Failed to initialize models', error);
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    await this.ensureInitialModels();

    const query = this.modelRepository.createQueryBuilder('model');

    if (search) {
      query.where(
        'model.name LIKE :search OR model.slug LIKE :search OR model.description LIKE :search',
        { search: `%${search}%` },
      );
    }

    query
      .orderBy('model.sortOrder', 'ASC')
      .addOrderBy('model.createdAt', 'DESC');

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

  async findAllOptions() {
    await this.ensureInitialModels();

    return this.modelRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAllActive() {
    await this.ensureInitialModels();

    return this.modelRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async getDefaultModelSlug() {
    const activeModels = await this.findAllActive();
    if (activeModels.length === 0) {
      throw new BadRequestException('暂无可用模型，请先在模型管理中启用模型');
    }

    return activeModels[0].slug;
  }

  async resolveActiveModelSlug(requestedSlug?: string) {
    const activeModels = await this.findAllActive();

    if (activeModels.length === 0) {
      throw new BadRequestException('暂无可用模型，请先在模型管理中启用模型');
    }

    if (!requestedSlug) return activeModels[0].slug;

    const normalizedSlug = requestedSlug.trim();
    if (activeModels.some((model) => model.slug === normalizedSlug)) {
      return normalizedSlug;
    }

    throw new BadRequestException('模型不可用或未启用');
  }

  async create(data: Partial<ModelConfig>) {
    await this.ensureInitialModels();
    const payload = await this.normalizeCreatePayload(data);
    const model = this.modelRepository.create(payload);
    return this.modelRepository.save(model);
  }

  async update(id: string, data: Partial<ModelConfig>) {
    await this.ensureInitialModels();
    const model = await this.modelRepository.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    const payload = await this.normalizeUpdatePayload(id, data);
    const previousSlug = model.slug;
    Object.assign(model, payload);
    const savedModel = await this.modelRepository.save(model);

    if (payload.slug && payload.slug !== previousSlug) {
      await this.replaceProviderModelSlug(previousSlug, payload.slug);
    }

    return savedModel;
  }

  async delete(id: string) {
    await this.ensureInitialModels();
    const result = await this.modelRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('模型不存在');
    }

    return { success: true };
  }

  private async ensureInitialModels() {
    if (!this.initialModelsPromise) {
      this.initialModelsPromise = this.seedInitialModels();
    }

    return this.initialModelsPromise;
  }

  private async seedInitialModels() {
    const count = await this.modelRepository.count();
    if (count > 0) return;

    const providers = await this.providerRepository.find();
    const providerModelSlugs = Array.from(
      new Set(
        providers.flatMap((provider) => this.parseModelList(provider.model)),
      ),
    );

    const seeds =
      providerModelSlugs.length > 0
        ? providerModelSlugs.map((slug, index) => ({
            slug,
            name: this.humanizeSlug(slug),
            description: '从现有供应商配置初始化',
            isActive: true,
            sortOrder: index,
          }))
        : [
            {
              slug: 'gpt-image-2',
              name: 'GPT-Image-2',
              description: '速度与质量的平衡模型',
              isActive: true,
              sortOrder: 0,
            },
          ];

    await this.modelRepository.save(this.modelRepository.create(seeds));
  }

  private parseModelList(value?: string | null) {
    if (!value) return [];

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private humanizeSlug(slug: string) {
    return slug
      .split(/[-_:/]+/)
      .filter(Boolean)
      .map((part) => {
        if (/^(gpt|ai|api|sdxl)$/i.test(part)) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  private async normalizeCreatePayload(data: Partial<ModelConfig>) {
    const slug = this.normalizeSlug(data.slug);
    const name = this.normalizeName(data.name, slug);

    await this.ensureSlugAvailable(slug);

    return {
      slug,
      name,
      description: this.normalizeDescription(data.description),
      isActive: data.isActive ?? true,
      sortOrder: this.normalizeSortOrder(data.sortOrder),
    };
  }

  private async normalizeUpdatePayload(id: string, data: Partial<ModelConfig>) {
    const payload: Partial<ModelConfig> = {};

    if (Object.prototype.hasOwnProperty.call(data, 'slug')) {
      const slug = this.normalizeSlug(data.slug);
      await this.ensureSlugAvailable(slug, id);
      payload.slug = slug;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
      payload.name = this.normalizeName(data.name, payload.slug);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'description')) {
      payload.description = this.normalizeDescription(data.description);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
      payload.isActive = Boolean(data.isActive);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'sortOrder')) {
      payload.sortOrder = this.normalizeSortOrder(data.sortOrder);
    }

    return payload;
  }

  private normalizeSlug(slug?: string) {
    const normalized = slug?.trim();

    if (!normalized) {
      throw new BadRequestException('模型标识不能为空');
    }

    if (normalized.includes(',')) {
      throw new BadRequestException('模型标识不能包含逗号');
    }

    return normalized;
  }

  private normalizeName(name?: string, fallback?: string) {
    const normalized = name?.trim() || fallback?.trim();

    if (!normalized) {
      throw new BadRequestException('模型名称不能为空');
    }

    return normalized;
  }

  private normalizeDescription(description?: string | null) {
    return description?.trim() || '';
  }

  private normalizeSortOrder(sortOrder?: number) {
    const numericSortOrder = Number(sortOrder ?? 0);
    return Number.isFinite(numericSortOrder) ? numericSortOrder : 0;
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.modelRepository.findOne({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new BadRequestException('模型标识已存在');
    }
  }

  private async replaceProviderModelSlug(
    previousSlug: string,
    nextSlug: string,
  ) {
    const providers = await this.providerRepository.find();

    for (const provider of providers) {
      const models = this.parseModelList(provider.model);
      if (!models.includes(previousSlug)) continue;

      provider.model = Array.from(
        new Set(
          models.map((model) => (model === previousSlug ? nextSlug : model)),
        ),
      ).join(',');
      await this.providerRepository.save(provider);
    }
  }
}
