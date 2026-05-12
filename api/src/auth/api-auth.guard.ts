import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export type RecallHubAuth = {
  subject: string;
  roles: string[];
  permissions: string[];
  authType: 'api_key' | 'jwt';
};

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing API authorization token');
    }

    const apiKey = this.configService.getOrThrow<string>('APP_API_KEY');
    if (this.safeEqual(token, apiKey)) {
      request.recallhubAuth = {
        subject: 'control-plane-api-key',
        roles: this.configService
          .get<string>('APP_API_KEY_ROLES', 'admin,ops,user')
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
        permissions: [],
        authType: 'api_key',
      };
      return true;
    }

    const jwtAuth = this.verifyJwt(token);
    if (jwtAuth) {
      request.recallhubAuth = jwtAuth;
      return true;
    }

    throw new UnauthorizedException('Invalid API authorization token');
  }

  private extractToken(request: Request): string | undefined {
    const apiKey = request.headers['x-recallhub-api-key'];
    if (typeof apiKey === 'string' && apiKey.trim()) {
      return apiKey.trim();
    }

    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private verifyJwt(token: string): RecallHubAuth | undefined {
    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        role?: string;
        roles?: string[];
        permissions?: string[];
      }>(token, {
        secret: this.configService.getOrThrow<string>('APP_JWT_SECRET'),
      });

      const roles = Array.isArray(payload.roles)
        ? payload.roles
        : payload.role
          ? [payload.role]
          : ['user'];

      return {
        subject: payload.sub ?? 'jwt-user',
        roles: roles.filter((role) => typeof role === 'string' && role.trim()),
        permissions: Array.isArray(payload.permissions)
          ? payload.permissions.filter(
              (permission) => typeof permission === 'string' && permission.trim(),
            )
          : [],
        authType: 'jwt',
      };
    } catch {
      return undefined;
    }
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
