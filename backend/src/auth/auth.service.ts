import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    private jwtService: JwtService,
  ) {}

  async generateKey(): Promise<ApiKey> {
    const key = new ApiKey();
    key.key = 'pd_' + randomUUID().replace(/-/g, '');
    key.quota = 100;
    return this.apiKeyRepository.save(key);
  }

  async login(keyString: string) {
    const apiKey = await this.apiKeyRepository.findOne({ where: { key: keyString } });
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API Key');
    }
    if (!apiKey.isActive) {
      throw new UnauthorizedException('API Key has been disabled');
    }

    const payload = { sub: apiKey.id, key: apiKey.key };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      quota: apiKey.quota,
    };
  }

  async validateUser(id: string) {
    const user = await this.apiKeyRepository.findOne({ where: { id } });
    if (user && !user.isActive) {
      return null;
    }
    return user;
  }
}
