import { Controller, Post, Body, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('generate-key')
  async generateKey() {
    throw new ForbiddenException('公开申请 API Key 已关闭，请联系管理员发放');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('apiKey') apiKey: string) {
    return this.authService.login(apiKey);
  }
}
