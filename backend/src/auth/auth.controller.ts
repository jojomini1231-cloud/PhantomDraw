import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('generate-key')
  async generateKey() {
    return this.authService.generateKey();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('apiKey') apiKey: string) {
    return this.authService.login(apiKey);
  }
}
