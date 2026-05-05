import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUser } from './entities/admin-user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { ApiKey } from '../auth/entities/api-key.entity';
import { ApiKeyManagementController } from './api-key-management.controller';
import { ApiKeyManagementService } from './api-key-management.service';
import { GalleryItem } from '../gallery/entities/gallery-item.entity';
import { GalleryManagementController } from './gallery-management.controller';
import { GalleryManagementService } from './gallery-management.service';

import { Account } from './entities/account.entity';
import { AccountPoolController } from './account-pool.controller';
import { AccountPoolService } from './account-pool.service';
import { Provider } from './entities/provider.entity';
import { ProviderManagementController } from './provider-management.controller';
import { ProviderManagementService } from './provider-management.service';
import { GenerationLogController } from './generation-log.controller';
import { GenerationLogService } from './generation-log.service';
import { GenerationTask } from '../generate/entities/generation-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AuditLog, ApiKey, GalleryItem, Account, Provider, GenerationTask]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET', 'admin-secret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AdminController, ApiKeyManagementController, GalleryManagementController, AccountPoolController, ProviderManagementController, GenerationLogController],
  providers: [AdminService, AdminJwtStrategy, ApiKeyManagementService, GalleryManagementService, AccountPoolService, ProviderManagementService, GenerationLogService],
  exports: [AdminService, AccountPoolService, ProviderManagementService],
})
export class AdminModule {}
