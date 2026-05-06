import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { HealthService } from './health.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    healthService = module.get(HealthService);
  });

  it('returns Prometheus metrics payload', async () => {
    healthService.getMetrics.mockResolvedValue('# HELP test_metric\n');

    await expect(controller.getMetrics()).resolves.toBe('# HELP test_metric\n');
  });
});
