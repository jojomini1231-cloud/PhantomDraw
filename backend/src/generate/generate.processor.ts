import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationTask } from './entities/generation-task.entity';
import { GenerateGateway } from './generate.gateway';

@Processor('image-generation')
export class GenerateProcessor extends WorkerHost {
  constructor(
    @InjectRepository(GenerationTask)
    private taskRepository: Repository<GenerationTask>,
    private gateway: GenerateGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log('Processor started for job:', job.id, job.data);
    const { taskId } = job.data;
    const task = await this.taskRepository.findOne({ 
      where: { id: taskId },
      relations: ['apiKey']
    });

    if (!task) return;

    task.status = 'running';
    await this.taskRepository.save(task);
    this.gateway.sendTaskUpdate(task.apiKey.key, task);

    try {
      // Simulate AI generation process
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      task.status = 'success';
      task.imageUrl = `https://picsum.photos/seed/${task.id}/512/512`; 
      await this.taskRepository.save(task);
      this.gateway.sendTaskUpdate(task.apiKey.key, task);
    } catch (error: any) {
      task.status = 'failed';
      task.errorReason = error.message || 'Unknown error';
      await this.taskRepository.save(task);
      this.gateway.sendTaskUpdate(task.apiKey.key, task);
    }
  }
}
