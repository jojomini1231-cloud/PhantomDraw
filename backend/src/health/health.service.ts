import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Gauge, collectDefaultMetrics, register } from 'prom-client';

type DependencyStatus = {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
};

let metricsInitialized = false;

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.initializeMetrics();
  }

  getLiveness() {
    return {
      status: 'ok',
      service: 'phantomdraw-backend',
      version: this.getVersion(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dependencies = { database, redis };
    const status =
      database.status === 'up' && redis.status === 'up' ? 'ok' : 'error';

    return {
      status,
      service: 'phantomdraw-backend',
      version: this.getVersion(),
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  private initializeMetrics() {
    if (!metricsInitialized) {
      collectDefaultMetrics({ prefix: 'phantomdraw_' });
      metricsInitialized = true;
    }

    if (!register.getSingleMetric('phantomdraw_build_info')) {
      const buildInfo = new Gauge({
        name: 'phantomdraw_build_info',
        help: 'Static build metadata for the running service.',
        labelNames: ['service', 'version', 'environment'],
      });

      buildInfo.set(
        {
          service: 'backend',
          version: this.getVersion(),
          environment:
            this.configService.get<string>('NODE_ENV') ?? 'development',
        },
        1,
      );
    }
  }

  private getVersion() {
    return this.configService.get<string>('APP_VERSION') ?? 'dev';
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    const start = Date.now();

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: this.toErrorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const start = Date.now();
    const client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    try {
      await client.connect();
      await client.ping();

      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: this.toErrorMessage(error),
      };
    } finally {
      client.disconnect();
    }
  }

  private toErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'unknown error';
  }
}
