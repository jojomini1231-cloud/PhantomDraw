import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminUser } from '../entities/admin-user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true; // No specific roles required, any authenticated admin is fine
    }
    const { user } = context.switchToHttp().getRequest<{ user: AdminUser }>();
    if (!user) {
      return false;
    }

    // Superadmin has all permissions
    if (user.role === 'superadmin') {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
