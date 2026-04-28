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
}
