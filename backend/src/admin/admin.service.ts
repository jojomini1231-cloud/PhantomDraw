import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Automatically create a superadmin if no admin exists
    const count = await this.adminUserRepository.count();
    if (count === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.adminUserRepository.save({
        username: 'admin',
        passwordHash,
        role: 'superadmin',
      });
      console.log('Created default superadmin: admin / admin123');
    }
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
