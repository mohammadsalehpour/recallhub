import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowExecutor, WorkflowRunStatus } from '../generated/prisma/enums';
import { RunWorkflowDto } from './dto/run-workflow.dto';

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
    n8nPath: 'project-memory/draft-artifact',
    active: true,
  },
  {
    code: 'research.run',
    name: 'Research Run',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/research-run',
    active: true,
  },
  {
    code: 'document.generate_spec',
    name: 'Generate Development Spec',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/generate-development-spec',
    active: true,
  },
  {
    code: 'document.review',
    name: 'Document Review',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/document-review',
    active: true,
  },
  {
    code: 'document.finalize',
    name: 'Final Document Consolidation',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/finalize-document',
    active: true,
  },
  {
    code: 'document.revise',
    name: 'Document Revision',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/revise-document',
    active: false,
  },
  {
    code: 'implementation.plan',
    name: 'Implementation Plan',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/implementation-plan',
    active: true,
  },
  {
    code: 'execution.simulate',
    name: 'Execution Simulation',
    executor: WorkflowExecutor.n8n,
    n8nPath: 'recallhub/execution-simulate',
    active: true,
  },
];

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

    if (dto.idempotency_key) {
      const existing = await this.prisma.workflowRun.findUnique({
        where: {
          workflowDefinitionId_idempotencyKey: {
            workflowDefinitionId: definition.id,
            idempotencyKey: dto.idempotency_key,
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
        projectId: dto.project_id,
        workItemId: dto.work_item_id,
        status: WorkflowRunStatus.pending,
        inputJson: dto.input as Prisma.InputJsonValue | undefined,
        idempotencyKey: dto.idempotency_key,
        triggeredBy: dto.triggered_by,
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
      projectId: dto.project_id,
      actorId: dto.triggered_by,
      action: 'workflow.run.create',
      resourceType: 'workflow_run',
      resourceId: run.id,
      metadataJson: { workflowCode: code },
    });

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
}
