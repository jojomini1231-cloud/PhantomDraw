import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getReadiness() {
    return this.assertReady();
  }

  @Get('live')
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getDetailedReadiness() {
    return this.assertReady();
  }

  private async assertReady() {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== 'ok') {
      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }
}
