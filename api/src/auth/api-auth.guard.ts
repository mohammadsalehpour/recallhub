import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export type RecallHubAuth = {
  subject: string;
  roles: string[];
  authType: 'api_key' | 'jwt';
};

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing API authorization token');
    }

    const apiKey = this.configService.getOrThrow<string>('APP_API_KEY');
    if (this.safeEqual(token, apiKey)) {
      request.recallhubAuth = {
        subject: 'appsmith-api-key',
        roles: this.configService
          .get<string>('APP_API_KEY_ROLES', 'admin,ops,user')
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
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
    const parts = token.split('.');
    if (parts.length !== 3) {
      return undefined;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    let header: { alg?: string; typ?: string };
    try {
      header = JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString('utf8'),
      ) as { alg?: string; typ?: string };
    } catch {
      return undefined;
    }

    if (header.alg !== 'HS256') {
      return undefined;
    }

    const expected = this.base64UrlEncode(
      createHmac(
        'sha256',
        this.configService.getOrThrow<string>('APP_JWT_SECRET'),
      )
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest(),
    );

    if (!this.safeEqual(signature, expected)) {
      return undefined;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as {
        sub?: string;
        role?: string;
        roles?: string[];
        exp?: number;
        nbf?: number;
      };

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return undefined;
      }

      if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
        return undefined;
      }

      const roles = Array.isArray(payload.roles)
        ? payload.roles
        : payload.role
          ? [payload.role]
          : ['user'];

      return {
        subject: payload.sub ?? 'jwt-user',
        roles: roles.filter((role) => typeof role === 'string' && role.trim()),
        authType: 'jwt',
      };
    } catch {
      return undefined;
    }
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64url');
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
