import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditInput = {
  projectId?: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome?: 'success' | 'failure';
  reason?: string;
  metadataJson?: Record<string, unknown>;
};

export type AuditLogQuery = {
  projectId?: string;
  limit?: number;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        outcome: input.outcome ?? 'success',
        reason: input.reason,
        metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listLogs(query: AuditLogQuery) {
    const limit =
      query.limit && Number.isFinite(query.limit)
        ? Math.min(Math.max(Math.trunc(query.limit), 1), 500)
        : 200;

    const logs = await this.prisma.auditLog.findMany({
      where: { projectId: query.projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, data: logs };
  }
}
