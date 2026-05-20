import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationTask } from './entities/generation-task.entity';
import { GenerateGateway } from './generate.gateway';
import { ChatgptService } from './chatgpt.service';
import { AccountPoolService } from '../admin/account-pool.service';
import { ProviderManagementService } from '../admin/provider-management.service';
import { Provider } from '../admin/entities/provider.entity';
import { ObjectStorageService } from './object-storage.service';
import { ApiKey } from '../auth/entities/api-key.entity';

@Processor('image-generation')
export class GenerateProcessor extends WorkerHost {
  private currentProviderIndex = 0;

  constructor(
    @InjectRepository(GenerationTask)
    private taskRepository: Repository<GenerationTask>,
    private gateway: GenerateGateway,
    private chatgptService: ChatgptService,
    private accountPoolService: AccountPoolService,
    private providerManagementService: ProviderManagementService,
    private objectStorageService: ObjectStorageService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log('Processor started for job:', job.id, job.data);
    const { taskId } = job.data;
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['apiKey'],
    });

    if (!task) return;

    task.status = 'running';
    await this.taskRepository.save(task);
    this.gateway.sendTaskUpdate(task.apiKey.key, task);

    const activeProviders =
      await this.providerManagementService.findAllActive();
    const requestedModel = task.model?.trim();
    const supportedProviders = requestedModel
      ? activeProviders.filter((provider) =>
          this.providerSupportsModel(provider, requestedModel),
        )
      : [];
    const providerPool = requestedModel ? supportedProviders : activeProviders;
    const providerRequestModel = requestedModel || undefined;

    if (providerPool.length > 0) {
      let lastError: Error | null = null;
      let success = false;
      const totalProviders = providerPool.length;

      for (let i = 0; i < totalProviders; i++) {
        const providerIndex = (this.currentProviderIndex + i) % totalProviders;
        const provider = providerPool[providerIndex];

        try {
          let imageUrl = '';
          const fullPrompt = task.negativePrompt
            ? `${task.prompt}\nNegative prompt: ${task.negativePrompt}`
            : task.prompt;

          if (task.type === 'txt2img') {
            imageUrl = await this.generateWithProvider(
              provider,
              fullPrompt,
              task.size,
              providerRequestModel,
            );
          } else if (task.type === 'img2img' && task.initImage) {
            imageUrl = await this.editWithProvider(
              provider,
              fullPrompt,
              task.initImage,
              task.size,
              providerRequestModel,
            );
          } else {
            throw new Error('Invalid task type or missing initImage');
          }

          this.currentProviderIndex = (providerIndex + 1) % totalProviders;

          const storedImage =
            await this.objectStorageService.storeGeneratedImage(
              task.id,
              imageUrl,
            );

          task.status = 'success';
          task.imageUrl = storedImage.imageUrl;
          task.storageKey = storedImage.storageKey;
          task.providerName = provider.name;
          await this.taskRepository.save(task);
          this.gateway.sendTaskUpdate(task.apiKey.key, task);

          success = true;
          break;
        } catch (error: any) {
          console.error(`Provider ${provider.name} failed:`, error.message);
          lastError = error;
        }
      }

      if (!success) {
        task.status = 'failed';
        task.errorReason = lastError?.message || 'All providers failed';
        await this.taskRepository.save(task);
        await this.refundQuota(task);
        this.gateway.sendTaskUpdate(task.apiKey.key, task);
      }
      return;
    }

    // Fallback to ChatGPT account pool
    let account = null;
    try {
      account = await this.accountPoolService.getAvailableAccount();
      if (!account) {
        throw new Error('No available ChatGPT accounts in the pool.');
      }

      let imageUrl = '';
      if (task.type === 'txt2img') {
        const fullPrompt = task.negativePrompt
          ? `${task.prompt}\nNegative prompt: ${task.negativePrompt}`
          : task.prompt;
        imageUrl = await this.chatgptService.generateImage(
          account.accessToken,
          fullPrompt,
          task.model || 'auto',
        );
      } else if (task.type === 'img2img' && task.initImage) {
        const fullPrompt = task.negativePrompt
          ? `${task.prompt}\nNegative prompt: ${task.negativePrompt}`
          : task.prompt;
        imageUrl = await this.chatgptService.editImage(
          account.accessToken,
          fullPrompt,
          task.initImage,
          task.model || 'auto',
        );
      } else {
        throw new Error('Invalid task type or missing initImage');
      }

      // Deduct quota
      await this.accountPoolService.decrementQuota(account.id);

      const storedImage = await this.objectStorageService.storeGeneratedImage(
        task.id,
        imageUrl,
      );

      task.status = 'success';
      task.imageUrl = storedImage.imageUrl;
      task.storageKey = storedImage.storageKey;
      task.providerName = 'ChatGPT Pool';
      await this.taskRepository.save(task);
      this.gateway.sendTaskUpdate(task.apiKey.key, task);
    } catch (error: any) {
      console.error('Generation failed:', error);
      if (account) {
        await this.accountPoolService.incrementFail(account.id);
      }
      task.status = 'failed';
      task.errorReason = error.message || 'Unknown error';
      await this.taskRepository.save(task);
      await this.refundQuota(task);
      this.gateway.sendTaskUpdate(task.apiKey.key, task);
    }
  }

  private async refundQuota(task: GenerationTask) {
    if (!task.apiKey?.id) return;

    const refundAmount = Math.max(1, task.apiKey.multiplier ?? 10);
    await this.taskRepository.manager.increment(
      ApiKey,
      { id: task.apiKey.id },
      'quota',
      refundAmount,
    );
    const refundedApiKey = await this.taskRepository.manager.findOne(ApiKey, {
      where: { id: task.apiKey.id },
      select: ['id', 'quota'],
    });
    task.apiKey.quota = refundedApiKey?.quota ?? task.apiKey.quota + refundAmount;
    this.gateway.sendQuotaUpdate(task.apiKey.key, task.apiKey.quota);
  }

  private async generateWithProvider(
    provider: Provider,
    prompt: string,
    size?: string,
    requestedModel?: string,
  ): Promise<string> {
    const baseUrl = provider.baseUrl.endsWith('/')
      ? provider.baseUrl.slice(0, -1)
      : provider.baseUrl;
    const model = requestedModel || provider.model || 'dall-e-3';

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: model.split(',')[0].trim(),
        prompt: prompt,
        n: 1,
        size: size || '1024x1024',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].url) {
      return data.data[0].url;
    } else if (data.data && data.data.length > 0 && data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    throw new Error('Invalid response format from provider');
  }

  private async editWithProvider(
    provider: Provider,
    prompt: string,
    initImageBase64: string,
    size?: string,
    requestedModel?: string,
  ): Promise<string> {
    const baseUrl = provider.baseUrl.endsWith('/')
      ? provider.baseUrl.slice(0, -1)
      : provider.baseUrl;
    const model = requestedModel || provider.model || 'dall-e-2';
    const { buffer, mimeType } = await this.loadImageInput(initImageBase64);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('image', blob, 'image.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', size || '1024x1024');
    formData.append('model', model.split(',')[0].trim());

    const response = await fetch(`${baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.key}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].url) {
      return data.data[0].url;
    } else if (data.data && data.data.length > 0 && data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    throw new Error('Invalid response format from provider');
  }

  private async loadImageInput(
    imageInput: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    if (/^https?:\/\//i.test(imageInput)) {
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch reference image: ${response.status}`);
      }

      const mimeType =
        response.headers.get('content-type')?.split(';')[0] || 'image/png';
      const arrayBuffer = await response.arrayBuffer();

      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType,
      };
    }

    const dataUrlMatch = imageInput.match(/^data:(image\/[\w.+-]+);base64,/);
    const mimeType = dataUrlMatch?.[1] || 'image/png';
    const base64Data = imageInput.replace(/^data:image\/[\w.+-]+;base64,/, '');

    return {
      buffer: Buffer.from(base64Data, 'base64'),
      mimeType,
    };
  }

  private providerSupportsModel(provider: Provider, model: string) {
    return provider.model
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(model);
  }
}
