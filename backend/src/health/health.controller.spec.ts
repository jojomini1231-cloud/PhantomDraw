import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getLiveness: jest.fn(),
            getReadiness: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  it('returns liveness payload', () => {
    healthService.getLiveness.mockReturnValue({
      status: 'ok',
      service: 'phantomdraw-backend',
      version: 'test',
      timestamp: '2026-05-06T00:00:00.000Z',
    });

    expect(controller.getLiveness()).toEqual({
      status: 'ok',
      service: 'phantomdraw-backend',
      version: 'test',
      timestamp: '2026-05-06T00:00:00.000Z',
    });
  });

  it('returns readiness payload when dependencies are healthy', async () => {
    healthService.getReadiness.mockResolvedValue({
      status: 'ok',
      service: 'phantomdraw-backend',
      version: 'test',
      timestamp: '2026-05-06T00:00:00.000Z',
      dependencies: {
        database: { status: 'up', latencyMs: 3 },
        redis: { status: 'up', latencyMs: 5 },
      },
    });

    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      dependencies: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    });
  });

  it('throws 503 when dependencies are unhealthy', async () => {
    healthService.getReadiness.mockResolvedValue({
      status: 'error',
      service: 'phantomdraw-backend',
      version: 'test',
      timestamp: '2026-05-06T00:00:00.000Z',
      dependencies: {
        database: { status: 'up', latencyMs: 3 },
        redis: { status: 'down', latencyMs: 5, error: 'ECONNREFUSED' },
      },
    });

    await expect(controller.getDetailedReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
