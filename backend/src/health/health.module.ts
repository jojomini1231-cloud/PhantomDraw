import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { HealthService } from './health.service';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController, MetricsController],
  providers: [HealthService],
})
export class HealthModule {}
