import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdminService } from '../admin.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly adminService: AdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // from AdminAuthGuard
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const url = req.url;

    // Only log mutations
    if (method !== 'GET') {
      return next.handle().pipe(
        tap(() => {
          if (user) {
            const bodyCopy = { ...req.body };
            // don't log passwords
            if (bodyCopy.password) bodyCopy.password = '***';
            
            this.adminService.logAction(user.id, `${method} ${url}`, ip, bodyCopy).catch(err => {
              console.error('Failed to write audit log', err);
            });
          }
        }),
      );
    }

    return next.handle();
  }
}
