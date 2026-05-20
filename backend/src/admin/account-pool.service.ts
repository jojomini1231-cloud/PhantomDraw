import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountPoolService {
  private readonly logger = new Logger(AccountPoolService.name);

  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async findAll() {
    return this.accountRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getAvailableAccount() {
    const account = await this.accountRepository.findOne({
      where: { status: '正常' },
      order: { quota: 'DESC' },
    });
    if (!account || account.quota <= 0) return null;
    return account;
  }

  async decrementQuota(id: string) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (account && account.quota > 0) {
      account.quota -= 1;
      account.success += 1;
      if (account.quota === 0) account.status = '限流';
      await this.accountRepository.save(account);
    }
  }

  async incrementFail(id: string) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (account) {
      account.fail += 1;
      await this.accountRepository.save(account);
    }
  }

  async addAccounts(tokens: string[]) {
    const cleanedTokens = [
      ...new Set(tokens.map((t) => t.trim()).filter((t) => t)),
    ];
    let added = 0;
    let skipped = 0;

    for (const token of cleanedTokens) {
      const existing = await this.accountRepository.findOne({
        where: { accessToken: token },
      });
      if (existing) {
        skipped++;
      } else {
        const account = this.accountRepository.create({
          accessToken: token,
          type: 'Free',
          status: '正常',
          quota: 0,
        });
        await this.accountRepository.save(account);
        added++;
      }
    }
    const items = await this.findAll();
    return { added, skipped, items };
  }

  async deleteAccounts(tokens: string[]) {
    const targetSet = [
      ...new Set(tokens.map((t) => t.trim()).filter((t) => t)),
    ];
    if (targetSet.length === 0)
      return { removed: 0, items: await this.findAll() };

    const result = await this.accountRepository.delete({
      accessToken: In(targetSet),
    });
    const items = await this.findAll();
    return { removed: result.affected || 0, items };
  }

  async updateAccount(accessToken: string, updates: Partial<Account>) {
    const account = await this.accountRepository.findOne({
      where: { accessToken },
    });
    if (!account) return null;

    Object.assign(account, updates);
    await this.accountRepository.save(account);
    const items = await this.findAll();
    return { items };
  }

  async fetchRemoteInfo(accessToken: string): Promise<Partial<Account>> {
    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'content-type': 'application/json',
      'oai-language': 'zh-CN',
      origin: 'https://chatgpt.com',
      referer: 'https://chatgpt.com/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    try {
      const meRes = await fetch('https://chatgpt.com/backend-api/me', {
        headers: { ...headers, 'x-openai-target-path': '/backend-api/me' },
      });
      if (meRes.status === 401) {
        throw new Error('/backend-api/me failed: HTTP 401');
      }
      const mePayload = (await meRes.json()) as Record<string, unknown>;

      const initRes = await fetch(
        'https://chatgpt.com/backend-api/conversation/init',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            gizmo_id: null,
            requested_default_model: null,
            conversation_id: null,
            timezone_offset_min: -480,
          }),
        },
      );
      const initPayload = (await initRes.json()) as Record<string, unknown>;

      const limitsProgress: unknown[] = Array.isArray(
        initPayload?.limits_progress,
      )
        ? (initPayload.limits_progress as unknown[])
        : [];

      let quota = 0;
      let restoreAt: string | null = null;
      for (const item of limitsProgress as Record<string, unknown>[]) {
        if (item?.feature_name === 'image_gen') {
          const remaining = item?.remaining;
          quota = parseInt(
            typeof remaining === 'string' || typeof remaining === 'number'
              ? String(remaining)
              : '0',
            10,
          );
          restoreAt = (item?.reset_after as string) || null;
          break;
        }
      }

      let type = 'Free';
      if (mePayload?.email) {
        type = mePayload?.has_active_subscription ? 'Plus' : 'Free';
      }

      return {
        email: mePayload?.email as string | undefined,
        userId: mePayload?.id as string | undefined,
        type,
        quota,
        limitsProgress: limitsProgress as any[],
        defaultModelSlug: initPayload?.default_model_slug as string | undefined,
        restoreAt: restoreAt ?? undefined,
        status: quota === 0 ? '限流' : '正常',
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        return { status: '异常', quota: 0 };
      }
      throw err;
    }
  }

  async refreshAccounts(tokens: string[]) {
    const cleanedTokens = [
      ...new Set(tokens.map((t) => t.trim()).filter((t) => t)),
    ];
    if (cleanedTokens.length === 0)
      return { refreshed: 0, errors: [], items: await this.findAll() };

    let refreshed = 0;
    const errors: { access_token: string; error: string }[] = [];

    for (const token of cleanedTokens) {
      try {
        const info = await this.fetchRemoteInfo(token);
        await this.updateAccount(token, info);
        refreshed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to refresh token ${token.slice(0, 12)}: ${message}`,
        );
        errors.push({ access_token: token, error: message });
      }
    }

    return { refreshed, errors, items: await this.findAll() };
  }
}
