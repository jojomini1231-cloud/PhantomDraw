import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { GenerateService } from './generate.service';
import { GenerateController } from './generate.controller';
import { GenerateProcessor } from './generate.processor';
import { GenerateGateway } from './generate.gateway';
import { GenerationTask } from './entities/generation-task.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { AdminModule } from '../admin/admin.module';
import { ChatgptService } from './chatgpt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GenerationTask, ApiKey]),
    AdminModule,
    BullModule.registerQueue({
      name: 'image-generation',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'secret'),
      }),
    }),
  ],
  controllers: [GenerateController],
  providers: [
    GenerateService,
    GenerateProcessor,
    GenerateGateway,
    ChatgptService,
    ObjectStorageService,
  ],
})
export class GenerateModule {}
