import { Controller, Get, Header } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class MetricsController {
  constructor(private readonly healthService: HealthService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics() {
    return this.healthService.getMetrics();
  }
}
