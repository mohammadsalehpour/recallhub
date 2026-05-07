import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { N8nClientService } from '../integrations/n8n/n8n-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowExecutor, WorkflowRunStatus } from '../generated/prisma/enums';
import { RunWorkflowDto } from './dto/run-workflow.dto';

const WORK_ITEM_LIFECYCLE_WORKFLOWS = new Set([
  'task.analyze',
  'research.run',
  'document.generate_spec',
  'document.review',
  'document.finalize',
  'document.revise',
  'implementation.plan',
  'execution.simulate',
]);

const WORKFLOW_DEFINITION_SEED = [
  {
    code: 'project.scan',
    name: 'Project Scan Artifact',
    executor: WorkflowExecutor.internal_worker,
    active: true,
  },
  {
    code: 'task.analyze',
    name: 'Task Intake Analysis',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/task.analyze',
    active: true,
  },
  {
    code: 'research.run',
    name: 'Research Run',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/research.run',
    active: true,
  },
  {
    code: 'document.generate_spec',
    name: 'Generate Development Spec',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/document.generate_spec',
    active: true,
  },
  {
    code: 'document.review',
    name: 'Document Review',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/document.review',
    active: true,
  },
  {
    code: 'document.finalize',
    name: 'Final Document Consolidation',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/document.finalize',
    active: true,
  },
  {
    code: 'document.revise',
    name: 'Document Revision',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/document.revise',
    active: false,
  },
  {
    code: 'implementation.plan',
    name: 'Implementation Plan',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/implementation.plan',
    active: true,
  },
  {
    code: 'execution.simulate',
    name: 'Execution Simulation',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/execution.simulate',
    active: true,
  },
];

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly n8nClient: N8nClientService,
  ) {}

  async onModuleInit() {
    await Promise.all(
      WORKFLOW_DEFINITION_SEED.map((definition) =>
        this.prisma.workflowDefinition.upsert({
          where: { code: definition.code },
          update: definition,
          create: definition,
        }),
      ),
    );
  }

  listDefinitions() {
    return this.prisma.workflowDefinition.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createRun(code: string, dto: RunWorkflowDto) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { code },
    });

    if (!definition || !definition.active) {
      throw new NotFoundException('Workflow definition not found or inactive');
    }

    if (WORK_ITEM_LIFECYCLE_WORKFLOWS.has(code)) {
      throw new BadRequestException({
        code: 'WORK_ITEM_WORKFLOW_REQUIRES_DOMAIN_ENDPOINT',
        message:
          'Work item lifecycle workflows must be started through /work-items endpoints so RecallHub can enforce state, approval, and audit policy.',
        workflowCode: code,
      });
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.workflowRun.findUnique({
        where: {
          workflowDefinitionId_idempotencyKey: {
            workflowDefinitionId: definition.id,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });

      if (existing) {
        throw new ConflictException({
          code: 'DUPLICATE_IDEMPOTENCY_KEY',
          workflowRunId: existing.id,
        });
      }
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowDefinitionId: definition.id,
        projectId: dto.projectId,
        workItemId: dto.workItemId,
        status: WorkflowRunStatus.pending,
        inputJson: dto.input as Prisma.InputJsonValue | undefined,
        idempotencyKey: dto.idempotencyKey,
        triggeredBy: dto.triggeredBy,
        events: {
          create: {
            eventType: 'workflow_run.created',
            payloadJson: { workflowCode: code },
          },
        },
      },
      include: { workflowDefinition: true, events: true },
    });

    await this.audit.record({
      projectId: dto.projectId,
      actorId: dto.triggeredBy,
      action: 'workflow.run.create',
      resourceType: 'workflow_run',
      resourceId: run.id,
      metadataJson: { workflowCode: code },
    });

    if (definition.executor === WorkflowExecutor.n8n) {
      return this.triggerN8nRun(run.id);
    }

    return { success: true, data: run };
  }

  listRuns() {
    return this.prisma.workflowRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: { workflowDefinition: true },
    });
  }

  async getRun(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflowDefinition: true, events: true },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    return { success: true, data: run };
  }

  listRunEvents(runId: string) {
    return this.prisma.workflowEvent.findMany({
      where: { workflowRunId: runId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async retryRun(runId: string) {
    const run = await this.requireRun(runId);
    const retryableStatuses: WorkflowRunStatus[] = [
      WorkflowRunStatus.failed,
      WorkflowRunStatus.timed_out,
      WorkflowRunStatus.callback_missing,
    ];

    if (!retryableStatuses.includes(run.status)) {
      throw new BadRequestException(
        `Workflow run status ${run.status} is not retryable`,
      );
    }

    if (run.workflowDefinition.executor !== WorkflowExecutor.n8n) {
      throw new BadRequestException('Retry is implemented for n8n runs only');
    }

    await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: WorkflowRunStatus.retrying,
        errorJson: undefined,
        finishedAt: undefined,
        events: {
          create: {
            eventType: 'workflow_run.retry.requested',
            payloadJson: { workflowCode: run.workflowDefinition.code },
          },
        },
      },
    });

    return this.triggerN8nRun(run.id);
  }

  async cancelRun(runId: string) {
    const run = await this.requireRun(runId);
    const cancellableStatuses: WorkflowRunStatus[] = [
      WorkflowRunStatus.pending,
      WorkflowRunStatus.running,
      WorkflowRunStatus.retrying,
    ];

    if (!cancellableStatuses.includes(run.status)) {
      throw new BadRequestException(
        `Workflow run status ${run.status} cannot be cancelled`,
      );
    }

    const cancelled = await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: WorkflowRunStatus.cancelled,
        finishedAt: new Date(),
        events: {
          create: {
            eventType: 'workflow_run.cancelled',
            payloadJson: { workflowCode: run.workflowDefinition.code },
          },
        },
      },
      include: { workflowDefinition: true, events: true },
    });

    return { success: true, data: cancelled };
  }

  private async triggerN8nRun(runId: string) {
    const run = await this.requireRun(runId);
    if (run.workflowDefinition.executor !== WorkflowExecutor.n8n) {
      return { success: true, data: run };
    }

    const running = await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: WorkflowRunStatus.running,
        startedAt: run.startedAt ?? new Date(),
        finishedAt: undefined,
        events: {
          create: {
            eventType: 'n8n.trigger.started',
            payloadJson: {
              workflowCode: run.workflowDefinition.code,
              n8nPath: run.workflowDefinition.n8nPath,
            },
          },
        },
      },
      include: { workflowDefinition: true, events: true },
    });

    try {
      const triggerResult = await this.n8nClient.triggerWorkflow(
        running.workflowDefinition,
        running,
      );
      await this.prisma.workflowEvent.create({
        data: {
          workflowRunId: running.id,
          eventType: 'n8n.trigger.accepted',
          payloadJson: triggerResult,
        },
      });
    } catch (error) {
      const serialized = this.serializeError(error);
      await this.prisma.workflowRun.update({
        where: { id: running.id },
        data: {
          status: WorkflowRunStatus.failed,
          errorJson: serialized,
          finishedAt: new Date(),
          events: {
            create: {
              eventType: 'n8n.trigger.failed',
              payloadJson: serialized,
            },
          },
        },
      });

      await this.audit.record({
        projectId: running.projectId ?? undefined,
        action: 'workflow.run.trigger_n8n',
        resourceType: 'workflow_run',
        resourceId: running.id,
        outcome: 'failure',
        reason: serialized.message,
        metadataJson: {
          workflowCode: running.workflowDefinition.code,
        },
      });

      throw new BadRequestException({
        code: 'N8N_TRIGGER_FAILED',
        workflowRunId: running.id,
        message: serialized.message,
      });
    }

    return this.getRun(running.id);
  }

  private async requireRun(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflowDefinition: true, events: true },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    return run;
  }

  private serializeError(error: unknown): { message: string; name?: string } {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }

    return { message: 'Unknown n8n trigger error' };
  }
}
