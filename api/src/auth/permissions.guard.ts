import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RecallHubAuth } from './api-auth.guard';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  owner: ['*'],
  project_owner: [
    'project.read',
    'project.create',
    'project.update',
    'project.archive',
    'project.configure_repository',
    'project.sync',
    'memory.read',
    'memory.write',
    'memory.commit',
    'work_item.read',
    'work_item.create',
    'work_item.update',
    'work_item.analyze',
    'work_item.research',
    'work_item.generate_spec',
    'work_item.review',
    'work_item.approve',
    'work_item.implement',
    'work_item.validate',
    'workflow.read',
    'workflow.run',
    'workflow.retry',
    'workflow.cancel',
    'audit.read',
  ],
  architect: [
    'project.read',
    'memory.read',
    'memory.write',
    'work_item.read',
    'work_item.create',
    'work_item.update',
    'work_item.analyze',
    'work_item.research',
    'work_item.generate_spec',
    'work_item.review',
    'work_item.approve',
    'work_item.implement',
    'workflow.read',
    'workflow.run',
    'audit.read',
  ],
  developer: [
    'project.read',
    'memory.read',
    'memory.commit',
    'work_item.read',
    'work_item.create',
    'work_item.update',
    'work_item.analyze',
    'work_item.research',
    'work_item.generate_spec',
    'work_item.implement',
    'work_item.validate',
    'workflow.read',
    'workflow.run',
  ],
  reviewer: [
    'project.read',
    'memory.read',
    'work_item.read',
    'work_item.review',
    'work_item.approve',
    'workflow.read',
  ],
  operator: [
    'project.read',
    'project.sync',
    'memory.read',
    'work_item.read',
    'workflow.read',
    'workflow.retry',
    'workflow.cancel',
    'audit.read',
  ],
  ops: [
    'project.read',
    'project.sync',
    'memory.read',
    'work_item.read',
    'workflow.read',
    'workflow.run',
    'workflow.retry',
    'workflow.cancel',
    'audit.read',
    'settings.write',
  ],
  user: [
    'project.read',
    'project.create',
    'project.configure_repository',
    'project.sync',
    'memory.read',
    'memory.commit',
    'work_item.read',
    'work_item.create',
    'work_item.update',
    'work_item.analyze',
    'work_item.research',
    'work_item.generate_spec',
    'work_item.review',
    'work_item.approve',
    'work_item.implement',
    'work_item.validate',
    'workflow.read',
    'workflow.run',
    'workflow.retry',
    'workflow.cancel',
    'audit.read',
  ],
  viewer: ['project.read', 'memory.read', 'work_item.read', 'workflow.read'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(
      (request.recallhubAuth?.roles ?? []).flatMap(
        (role) => ROLE_PERMISSIONS[role] ?? [],
      ),
    );

    if (
      granted.has('*') ||
      requiredPermissions.every((permission) => granted.has(permission))
    ) {
      return true;
    }

    throw new ForbiddenException('Insufficient RecallHub permission');
  }
}
