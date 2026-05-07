import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { RecallHubAuth } from '../auth/api-auth.guard';
import { AuditService } from './audit.service';

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    if (!WRITE_METHODS.has(request.method)) {
      return next.handle();
    }

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: (body) => {
          void this.record(request, response, startedAt, 'success', body);
        },
        error: (error: unknown) => {
          void this.record(request, response, startedAt, 'failure', undefined, error);
        },
      }),
    );
  }

  private async record(
    request: AuthenticatedRequest,
    response: Response,
    startedAt: number,
    outcome: 'success' | 'failure',
    body?: unknown,
    error?: unknown,
  ) {
    try {
      await this.audit.record({
        projectId: this.firstUuid([
          this.valueAt(request.params, 'projectId'),
          this.valueAt(request.body, 'projectId'),
          this.valueAt(body, 'data.projectId'),
          this.valueAt(body, 'data.project.id'),
        ]),
        actorId: this.uuidOrUndefined(request.recallhubAuth?.subject),
        action: `http.${request.method.toLowerCase()}`,
        resourceType: this.resourceType(request.path),
        resourceId: this.firstUuid([
          this.valueAt(request.params, 'id'),
          this.valueAt(request.params, 'runId'),
          this.valueAt(request.params, 'workItemId'),
          this.valueAt(request.body, 'id'),
          this.valueAt(body, 'data.id'),
          this.valueAt(body, 'data.workflowRun.id'),
          this.valueAt(body, 'data.workItem.id'),
        ]),
        outcome,
        reason: outcome === 'failure' ? this.errorMessage(error) : undefined,
        metadataJson: {
          method: request.method,
          path: request.path,
          params: request.params,
          query: request.query,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          authType: request.recallhubAuth?.authType,
          actorSubject: request.recallhubAuth?.subject,
          bodyKeys: this.bodyKeys(request.body),
        },
      });
    } catch {
      // Audit must never break the user-facing request path.
    }
  }

  private resourceType(path: string): string {
    return path
      .replace(/^\/api\/v1\/?/, '')
      .split('/')
      .filter(Boolean)[0] ?? 'unknown';
  }

  private bodyKeys(value: unknown): string[] {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value as Record<string, unknown>).sort()
      : [];
  }

  private firstUuid(values: unknown[]): string | undefined {
    for (const value of values) {
      const uuid = this.uuidOrUndefined(value);
      if (uuid) {
        return uuid;
      }
    }

    return undefined;
  }

  private uuidOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && UUID_PATTERN.test(value)
      ? value
      : undefined;
  }

  private valueAt(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, value);
  }

  private errorMessage(error: unknown): string | undefined {
    return error instanceof Error ? error.message : undefined;
  }
}
