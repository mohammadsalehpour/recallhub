import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RecallHubAuth } from './api-auth.guard';
import { REQUIRED_ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.recallhubAuth?.roles ?? [];

    if (requiredRoles.some((role) => roles.includes(role))) {
      return true;
    }

    throw new ForbiddenException('Insufficient RecallHub role');
  }
}
