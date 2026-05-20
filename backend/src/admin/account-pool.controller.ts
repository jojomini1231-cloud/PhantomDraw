import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AccountPoolService } from './account-pool.service';
import { Account } from './entities/account.entity';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('admin/accounts')
@UseGuards(AdminAuthGuard, RolesGuard)
export class AccountPoolController {
  constructor(private readonly accountPoolService: AccountPoolService) {}

  @Get()
  @Roles('admin', 'superadmin')
  async getAccounts() {
    const items = await this.accountPoolService.findAll();
    return { items };
  }

  @Post()
  @Roles('admin', 'superadmin')
  async addAccounts(@Body('tokens') tokens: string[]) {
    return this.accountPoolService.addAccounts(tokens);
  }

  @Delete()
  @Roles('admin', 'superadmin')
  async deleteAccounts(@Body('tokens') tokens: string[]) {
    return this.accountPoolService.deleteAccounts(tokens);
  }

  @Put(':token')
  @Roles('admin', 'superadmin')
  async updateAccount(
    @Param('token') token: string,
    @Body() updates: Partial<Account>,
  ) {
    return this.accountPoolService.updateAccount(token, updates);
  }

  @Post('refresh')
  @Roles('admin', 'superadmin')
  async refreshAccounts(@Body('tokens') tokens: string[]) {
    return this.accountPoolService.refreshAccounts(tokens);
  }
}
