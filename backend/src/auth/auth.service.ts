import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    private jwtService: JwtService,
  ) {}

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
      multiplier: apiKey.multiplier ?? 10,
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
