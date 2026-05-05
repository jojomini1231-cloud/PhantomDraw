import { Injectable, Logger, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const count = await this.adminUserRepository.count();
    if (count > 0) {
      return;
    }

    const bootstrapUsername = this.configService.get<string>('BOOTSTRAP_ADMIN_USERNAME')?.trim();
    const bootstrapPassword = this.configService.get<string>('BOOTSTRAP_ADMIN_PASSWORD');

    if (!bootstrapUsername || !bootstrapPassword) {
      this.logger.warn(
        'No admin user exists. Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD to create the first superadmin explicitly.',
      );
      return;
    }

    if (bootstrapPassword.length < 12) {
      this.logger.error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters long.');
      return;
    }

    const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
    await this.adminUserRepository.save({
      username: bootstrapUsername,
      passwordHash,
      role: 'superadmin',
    });

    this.logger.warn(
      `Bootstrapped initial superadmin "${bootstrapUsername}". Remove BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD after first startup.`,
    );
  }

  async login(username: string, pass: string) {
    const user = await this.adminUserRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('无效的用户名或密码');
    }
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('无效的用户名或密码');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async validateUser(id: string) {
    return this.adminUserRepository.findOne({ where: { id } });
  }

  async logAction(adminId: string, action: string, ipAddress: string, details?: any) {
    const log = new AuditLog();
    log.adminId = adminId;
    log.action = action;
    log.ipAddress = ipAddress;
    log.details = details ? JSON.stringify(details) : null;
    await this.auditLogRepository.save(log);
  }
}
