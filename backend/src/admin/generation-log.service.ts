import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationTask } from '../generate/entities/generation-task.entity';

@Injectable()
export class GenerationLogService {
  constructor(
    @InjectRepository(GenerationTask)
    private taskRepository: Repository<GenerationTask>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ) {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.apiKey', 'apiKey');

    if (search) {
      query.andWhere(
        '(task.prompt LIKE :search OR task.id LIKE :search OR apiKey.key LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status && status !== 'all') {
      query.andWhere('task.status = :status', { status });
    }

    query.orderBy('task.createdAt', 'DESC');

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Remove the initImage to save bandwidth when listing logs
    const sanitizedItems = items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initImage, ...rest } = item;
      return rest;
    });

    return {
      items: sanitizedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
