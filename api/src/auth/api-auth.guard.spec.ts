import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { ApiAuthGuard } from './api-auth.guard';

function contextWithAuthHeader(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
      }),
    }),
  } as ExecutionContext;
}

function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
) {
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('ApiAuthGuard JWT policy', () => {
  const guard = new ApiAuthGuard({
    getOrThrow: (key: string) => {
      if (key === 'APP_API_KEY') return 'test-api-key';
      if (key === 'APP_JWT_SECRET') return 'test-jwt-secret';
      throw new Error(`Unexpected key ${key}`);
    },
    get: () => 'admin',
  } as never, new JwtService());

  it('accepts a valid HS256 token', () => {
    const token = signJwt(
      { alg: 'HS256', typ: 'JWT' },
      { sub: '00000000-0000-4000-8000-000000000001', roles: ['admin'] },
      'test-jwt-secret',
    );

    expect(
      guard.canActivate(contextWithAuthHeader(`Bearer ${token}`)),
    ).toBe(true);
  });

  it('rejects tokens signed with an unexpected alg header', () => {
    const token = signJwt(
      { alg: 'HS384', typ: 'JWT' },
      { sub: '00000000-0000-4000-8000-000000000001', roles: ['admin'] },
      'test-jwt-secret',
    );

    expect(() =>
      guard.canActivate(contextWithAuthHeader(`Bearer ${token}`)),
    ).toThrow(UnauthorizedException);
  });

  it('rejects tokens that are not yet valid', () => {
    const token = signJwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: '00000000-0000-4000-8000-000000000001',
        roles: ['admin'],
        nbf: Math.floor(Date.now() / 1000) + 60,
      },
      'test-jwt-secret',
    );

    expect(() =>
      guard.canActivate(contextWithAuthHeader(`Bearer ${token}`)),
    ).toThrow(UnauthorizedException);
  });
});
