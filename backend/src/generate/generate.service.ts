import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
    if (user.quota <= 0) {
      throw new BadRequestException('Insufficient quota');
    }

    // Deduct quota
    user.quota -= 1;
    await this.apiKeyRepository.save(user);

    // Create task
    const task = this.taskRepository.create({
      type: dto.type,
      prompt: dto.prompt,
      negativePrompt: dto.negativePrompt,
      initImage: dto.initImage,
      model: dto.model || 'gpt-image-2',
      status: 'pending',
      apiKey: user,
    });
    await this.taskRepository.save(task);

    // Push to queue
    const job = await this.imageQueue.add('generate', { taskId: task.id });
    console.log('Job added to queue:', job.id);

    return { taskId: task.id, status: task.status, remainingQuota: user.quota };
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
  
  async getHistory(user: ApiKey) {
    return this.taskRepository.find({
      where: { apiKey: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }
}
