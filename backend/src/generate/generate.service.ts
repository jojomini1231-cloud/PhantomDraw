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

@Injectable()
export class GenerateService {
  constructor(
    @InjectRepository(GenerationTask)
    private taskRepository: Repository<GenerationTask>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectQueue('image-generation') private imageQueue: Queue,
  ) {}

  async createTask(user: ApiKey, dto: CreateTaskDto) {
    const multiplier = Math.max(1, user.multiplier ?? 10);
    let task: GenerationTask | null = null;
    let remainingQuota = user.quota;

    await this.apiKeyRepository.manager.transaction(async (transactionalEntityManager) => {
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
        model: dto.model || 'gpt-image-2',
        size: dto.size,
        status: 'pending',
        apiKey: latestUser,
      });
      task = await transactionalEntityManager.save(task);
      remainingQuota = latestUser.quota;
    });

    try {
      const job = await this.imageQueue.add(
        'generate',
        { taskId: task.id },
        { jobId: task.id },
      );
      console.log('Job added to queue:', job.id);
    } catch (error) {
      await this.apiKeyRepository.manager.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.increment(
          ApiKey,
          { id: user.id },
          'quota',
          multiplier,
        );

        if (task?.id) {
          await transactionalEntityManager.delete(GenerationTask, { id: task.id });
        }
      });

      throw new ServiceUnavailableException('Task queue unavailable, please retry');
    }

    return { taskId: task.id, status: task.status, remainingQuota };
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
}
