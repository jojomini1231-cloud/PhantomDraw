import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerationTask } from './entities/generation-task.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ObjectStorageService } from './object-storage.service';
import { ModelManagementService } from '../admin/model-management.service';

@Injectable()
export class GenerateService {
  constructor(
    @InjectRepository(GenerationTask)
    private taskRepository: Repository<GenerationTask>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectQueue('image-generation') private imageQueue: Queue,
    private objectStorageService: ObjectStorageService,
    private modelManagementService: ModelManagementService,
  ) {}

  async createTask(user: ApiKey, dto: CreateTaskDto) {
    const multiplier = Math.max(1, user.multiplier ?? 10);
    const model = await this.modelManagementService.resolveActiveModelSlug(
      dto.model,
    );
    let task: GenerationTask | null = null;
    let remainingQuota = user.quota;

    await this.apiKeyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const latestUser = await transactionalEntityManager.findOne(ApiKey, {
          where: { id: user.id },
        });

        if (!latestUser) {
          throw new NotFoundException('API key not found');
        }

        if (latestUser.quota < multiplier) {
          throw new BadRequestException('Insufficient quota');
        }

        latestUser.quota -= multiplier;
        await transactionalEntityManager.save(latestUser);

        task = transactionalEntityManager.create(GenerationTask, {
          type: dto.type,
          prompt: dto.prompt,
          negativePrompt: dto.negativePrompt,
          initImage: dto.initImage,
          model,
          size: dto.size,
          status: 'pending',
          apiKey: latestUser,
        });
        task = await transactionalEntityManager.save(task);
        remainingQuota = latestUser.quota;
      },
    );

    if (!task) {
      throw new ServiceUnavailableException(
        'Task creation failed, please retry',
      );
    }

    const createdTask = task as GenerationTask;

    try {
      const job = await this.imageQueue.add(
        'generate',
        { taskId: createdTask.id },
        { jobId: createdTask.id },
      );
      console.log('Job added to queue:', job.id);
    } catch (error) {
      await this.apiKeyRepository.manager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager.increment(
            ApiKey,
            { id: user.id },
            'quota',
            multiplier,
          );

          if (createdTask.id) {
            await transactionalEntityManager.delete(GenerationTask, {
              id: createdTask.id,
            });
          }
        },
      );

      throw new ServiceUnavailableException(
        'Task queue unavailable, please retry',
      );
    }

    return {
      taskId: createdTask.id,
      status: createdTask.status,
      remainingQuota,
    };
  }

  async getTaskStatus(taskId: string, user: ApiKey) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, apiKey: { id: user.id } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async getHistory(
    user: ApiKey,
    options: { limit?: string; offset?: string } = {},
  ) {
    const parsedLimit = Number.parseInt(options.limit || '24', 10);
    const parsedOffset = Number.parseInt(options.offset || '0', 10);
    const take = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 24;
    const skip = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const [items, total] = await this.taskRepository.findAndCount({
      where: { apiKey: { id: user.id } },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return {
      items,
      total,
      limit: take,
      offset: skip,
      hasMore: skip + items.length < total,
      nextOffset: skip + items.length,
    };
  }

  async getTaskAsset(taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: ['id', 'storageKey'],
    });

    if (!task?.storageKey) {
      throw new NotFoundException('Stored image not found');
    }

    return this.objectStorageService.getStoredImage(task.storageKey);
  }
}
