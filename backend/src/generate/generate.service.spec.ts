import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GenerateService } from './generate.service';
import { GenerationTask } from './entities/generation-task.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { ObjectStorageService } from './object-storage.service';

describe('GenerateService', () => {
  let service: GenerateService;
  let imageQueue: { add: jest.Mock };
  let apiKeyRepository: {
    manager: { transaction: jest.Mock };
  };

  beforeEach(async () => {
    imageQueue = {
      add: jest.fn(),
    };

    apiKeyRepository = {
      manager: {
        transaction: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateService,
        {
          provide: getRepositoryToken(GenerationTask),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeyRepository,
        },
        {
          provide: getQueueToken('image-generation'),
          useValue: imageQueue,
        },
        {
          provide: ObjectStorageService,
          useValue: {
            getStoredImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GenerateService>(GenerateService);
  });

  it('should refund quota and delete task when queue enqueue fails', async () => {
    const savedUser = { id: 'user-1', quota: 20, multiplier: 10 };
    const savedTask = {
      id: 'task-1',
      status: 'pending',
      apiKey: savedUser,
    };
    const save = jest
      .fn()
      .mockImplementationOnce(async (entity) => entity)
      .mockImplementationOnce(async () => savedTask);
    const increment = jest.fn();
    const removeTask = jest.fn();

    apiKeyRepository.manager.transaction
      .mockImplementationOnce(async (callback) =>
        callback({
          findOne: jest.fn().mockResolvedValue(savedUser),
          save,
          create: jest.fn().mockReturnValue(savedTask),
        }),
      )
      .mockImplementationOnce(async (callback) =>
        callback({
          increment,
          delete: removeTask,
        }),
      );

    imageQueue.add.mockRejectedValue(new Error('redis down'));

    await expect(
      service.createTask(
        { id: 'user-1', quota: 20, multiplier: 10 } as ApiKey,
        {
          type: 'txt2img',
          prompt: 'cat',
        },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(increment).toHaveBeenCalledWith(ApiKey, { id: 'user-1' }, 'quota', 10);
    expect(removeTask).toHaveBeenCalledWith(GenerationTask, { id: 'task-1' });
  });

  it('should reject when quota is insufficient', async () => {
    apiKeyRepository.manager.transaction.mockImplementationOnce(async (callback) =>
      callback({
        findOne: jest.fn().mockResolvedValue({ id: 'user-1', quota: 5, multiplier: 10 }),
      }),
    );

    await expect(
      service.createTask(
        { id: 'user-1', quota: 5, multiplier: 10 } as ApiKey,
        {
          type: 'txt2img',
          prompt: 'cat',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(imageQueue.add).not.toHaveBeenCalled();
  });
});
