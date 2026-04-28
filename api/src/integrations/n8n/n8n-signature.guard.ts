import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Injectable()
export class N8nSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const timestamp = this.header(request, 'x-recallhub-timestamp');
    const runId = this.header(request, 'x-recallhub-run-id');
    const signature = this.header(request, 'x-recallhub-signature');

    if (!timestamp || !runId || !signature) {
      throw new UnauthorizedException('Missing n8n callback signature headers');
    }

    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      !Number.isFinite(timestampSeconds) ||
      Math.abs(nowSeconds - timestampSeconds) > 300
    ) {
      throw new UnauthorizedException(
        'n8n callback timestamp is outside allowed skew',
      );
    }

    const rawBody =
      request.rawBody?.toString('utf8') ?? JSON.stringify(request.body);
    const secret = this.configService.getOrThrow<string>('N8N_CALLBACK_SECRET');
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${runId}.${rawBody}`)
      .digest('hex');

    if (!this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid n8n callback signature');
    }

    return true;
  }

  private header(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
