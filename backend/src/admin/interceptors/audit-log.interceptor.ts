import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminService } from '../admin.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly adminService: AdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: { id: string };
      ip?: string;
      connection?: { remoteAddress?: string };
      method: string;
      url: string;
      body: Record<string, unknown>;
    }>();
    const user = req.user;
    const ip = req.ip || req.connection?.remoteAddress || '';
    const method = req.method;
    const url = req.url;

    if (method !== 'GET') {
      return next.handle().pipe(
        tap(() => {
          if (user) {
            const bodyCopy = { ...req.body };
            if (bodyCopy.password) bodyCopy.password = '***';

            this.adminService
              .logAction(user.id, `${method} ${url}`, ip, bodyCopy)
              .catch((err: unknown) => {
                console.error('Failed to write audit log', err);
              });
          }
        }),
      );
    }

    return next.handle();
  }
}
