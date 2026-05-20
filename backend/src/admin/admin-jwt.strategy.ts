import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'ADMIN_JWT_SECRET',
        'admin-secret',
      ),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.adminService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('管理员用户不存在或已失效');
    }
    return user;
  }
}
