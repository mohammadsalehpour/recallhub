import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { N8nClientService } from '../integrations/n8n/n8n-client.service';
import {
  ProjectStatus,
  WorkItemStatus,
  WorkflowExecutor,
  WorkflowRunStatus,
} from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { CreateMemoryCommitDto } from './dto/create-memory-commit.dto';
import { HumanApprovalDto } from './dto/human-approval.dto';
import { StartWorkflowDto } from './dto/start-workflow.dto';

const SUCCESS_STATUS_TRANSITIONS: Record<string, WorkItemStatus> = {
  'task.analyze': WorkItemStatus.needs_research,
  'research.run': WorkItemStatus.research_ready,
  'document.generate_spec': WorkItemStatus.spec_review,
  'document.review': WorkItemStatus.needs_human_approval,
  'document.finalize': WorkItemStatus.needs_human_approval,
  'document.revise': WorkItemStatus.spec_review,
  'implementation.plan': WorkItemStatus.implementation_planning,
  'execution.simulate': WorkItemStatus.done_pending_memory_commit,
};

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly n8nClient: N8nClientService,
  ) {}

  async create(projectCode: string, dto: CreateWorkItemDto) {
    const project = await this.requireProject(projectCode);
    const workItem = await this.prisma.workItem.create({
      data: {
        projectId: project.id,
        title: dto.title,
        originalRequest: dto.original_request,
        requestType: dto.request_type,
        status: WorkItemStatus.needs_research,
        riskLevel: dto.risk_level ?? 'medium',
        priority: dto.priority ?? 'normal',
        requestedBy: dto.requested_by,
        openQuestionsJson: dto.open_questions,
        metadataJson: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.createWorkItemEvent({
      projectId: project.id,
      workItemId: workItem.id,
      eventType: 'work_item.created',
      summary: `Work item ${workItem.title} created`,
      afterJson: { status: workItem.status },
    });

    await this.audit.record({
      projectId: project.id,
      actorId: dto.requested_by,
      action: 'work_item.create',
      resourceType: 'work_item',
      resourceId: workItem.id,
      metadataJson: { requestType: dto.request_type },
    });

    return { success: true, data: workItem };
  }

  async list(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.workItem.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContextPacket(workItemId: string) {
    const workItem = await this.requireWorkItem(workItemId);

    const [recentArtifacts, recentMemoryEvents, recentModules] =
      await Promise.all([
        this.prisma.artifact.findMany({
          where: {
            projectId: workItem.projectId,
            OR: [{ workItemId }, { workItemId: null }],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.memoryEvent.findMany({
          where: { projectId: workItem.projectId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.projectModule.findMany({
          where: { projectId: workItem.projectId },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),
      ]);

    return {
      success: true,
      data: {
        project: workItem.project,
        work_item: workItem,
        recent_artifacts: recentArtifacts,
        recent_memory_events: recentMemoryEvents,
        recent_modules: recentModules,
      },
    };
  }

  async getStatus(workItemId: string) {
    const workItem = await this.requireWorkItem(workItemId);
    return {
      success: true,
      data: {
        id: workItem.id,
        projectId: workItem.projectId,
        status: workItem.status,
        riskLevel: workItem.riskLevel,
        updatedAt: workItem.updatedAt,
      },
    };
  }

  async listArtifacts(workItemId: string) {
    const workItem = await this.requireWorkItem(workItemId);
    const artifacts = await this.prisma.artifact.findMany({
      where: { workItemId: workItem.id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: artifacts };
  }

  async analyze(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.needs_project_context,
      WorkItemStatus.needs_research,
      WorkItemStatus.research_ready,
    ]);

    const run = await this.startWorkflowRun(workItem, 'task.analyze', dto);
    return { success: true, data: { workflowRun: run } };
  }

  async startResearch(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.needs_research,
      WorkItemStatus.research_ready,
    ]);

    const run = await this.startWorkflowRun(workItem, 'research.run', dto);
    await this.transitionStatus(workItem, WorkItemStatus.research_in_progress, {
      workflowCode: 'research.run',
      runId: run.id,
    });

    return { success: true, data: { workflowRun: run } };
  }

  async startSpecGeneration(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.research_ready,
      WorkItemStatus.spec_review,
    ]);

    const run = await this.startWorkflowRun(
      workItem,
      'document.generate_spec',
      dto,
    );
    await this.transitionStatus(workItem, WorkItemStatus.spec_drafting, {
      workflowCode: 'document.generate_spec',
      runId: run.id,
    });

    return { success: true, data: { workflowRun: run } };
  }

  async reviewDocument(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.spec_review,
      WorkItemStatus.needs_human_approval,
    ]);

    const run = await this.startWorkflowRun(workItem, 'document.review', dto);
    return { success: true, data: { workflowRun: run } };
  }

  async finalizeDocument(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.spec_review,
      WorkItemStatus.needs_human_approval,
    ]);

    const run = await this.startWorkflowRun(workItem, 'document.finalize', dto);
    return { success: true, data: { workflowRun: run } };
  }

  async submitHumanApproval(workItemId: string, dto: HumanApprovalDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [WorkItemStatus.needs_human_approval]);
    const isApproved = dto.decision !== 'reject';
    const isWaiver = dto.decision === 'approve_with_waiver';
    const workItemQuestions = this.openQuestions(workItem.openQuestionsJson);

    if (isApproved && workItemQuestions.length > 0 && !isWaiver) {
      throw new BadRequestException({
        code: 'OPEN_QUESTIONS_REQUIRE_WAIVER',
        message:
          'Open questions must be resolved before approval, or approved with waiver.',
        openQuestions: workItemQuestions,
      });
    }

    const finalDocument = isApproved
      ? await this.requireFinalDocumentArtifact(workItem.id, dto.artifact_id)
      : null;
    const openQuestions = this.blockingQuestions(
      workItem.openQuestionsJson,
      finalDocument?.contentJson,
    );

    if (isWaiver && !dto.reason?.trim()) {
      throw new BadRequestException(
        'Waiver approval requires an explicit review reason',
      );
    }

    if (isApproved && openQuestions.length > 0 && !isWaiver) {
      throw new BadRequestException({
        code: 'OPEN_QUESTIONS_REQUIRE_WAIVER',
        message:
          'Open questions must be resolved before approval, or approved with waiver.',
        openQuestions,
      });
    }

    const artifactId = isApproved ? finalDocument!.id : dto.artifact_id;

    const nextStatus = isApproved
      ? WorkItemStatus.approved_for_implementation
      : WorkItemStatus.rejected;
    const approvalDecision = isWaiver
      ? 'approved_with_waiver'
      : isApproved
        ? 'approved_for_implementation'
        : 'rejected';

    await this.prisma.humanApproval.create({
      data: {
        projectId: workItem.projectId,
        workItemId: workItem.id,
        artifactId,
        decision: approvalDecision,
        reviewedBy: dto.actor_id,
        reviewNote: dto.reason,
      },
    });

    let updated = await this.transitionStatus(workItem, nextStatus, {
      reason: dto.reason,
      actorId: dto.actor_id,
      artifactId,
      decision: approvalDecision,
      openQuestionsWaived: isWaiver ? openQuestions : undefined,
    });

    if (isWaiver) {
      updated = await this.prisma.workItem.update({
        where: { id: updated.id },
        data: {
          riskLevel: this.bumpRiskLevel(updated.riskLevel),
          metadataJson: {
            ...(this.objectRecord(updated.metadataJson) ?? {}),
            waiver: {
              reason: dto.reason,
              openQuestions,
              approvedAt: new Date().toISOString(),
            },
          },
        },
      });
    }

    await this.audit.record({
      projectId: updated.projectId,
      actorId: dto.actor_id,
      action: 'work_item.human_approval',
      resourceType: 'work_item',
      resourceId: updated.id,
      metadataJson: { decision: approvalDecision, reason: dto.reason },
    });

    return { success: true, data: updated };
  }

  async createImplementationPlan(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.approved_for_implementation,
      WorkItemStatus.implementation_planning,
    ]);
    await this.assertImplementationPrerequisites(workItem);

    const run = await this.startWorkflowRun(
      workItem,
      'implementation.plan',
      dto,
    );

    return { success: true, data: { workflowRun: run } };
  }

  async simulateExecution(workItemId: string, dto: StartWorkflowDto) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.implementation_planning,
    ]);
    await this.assertImplementationPrerequisites(workItem);

    const run = await this.startWorkflowRun(
      workItem,
      'execution.simulate',
      dto,
    );
    await this.transitionStatus(
      workItem,
      WorkItemStatus.implementation_in_progress,
      {
        workflowCode: 'execution.simulate',
        runId: run.id,
        mode: 'simulation',
      },
    );

    return { success: true, data: { workflowRun: run } };
  }

  async completeWithMemoryCommit(
    workItemId: string,
    dto: CreateMemoryCommitDto,
  ) {
    const workItem = await this.requireWorkItem(workItemId);
    this.assertStatus(workItem.status, [
      WorkItemStatus.done_pending_memory_commit,
    ]);

    const commit = await this.prisma.memoryCommit.create({
      data: {
        projectId: workItem.projectId,
        workItemId: workItem.id,
        title: dto.title,
        whatChanged: dto.what_changed,
        whyChanged: dto.why_changed,
        howChanged: dto.how_changed,
        filesTouchedJson: dto.files_touched as
          | Prisma.InputJsonValue
          | undefined,
        modulesTouchedJson: dto.modules_touched as
          | Prisma.InputJsonValue
          | undefined,
        commandsRunJson: dto.commands_run as Prisma.InputJsonValue | undefined,
        validationResultJson: dto.validation_result as
          | Prisma.InputJsonValue
          | undefined,
        risksRemainingJson: dto.risks_remaining as
          | Prisma.InputJsonValue
          | undefined,
        createdBy: dto.created_by,
      },
    });

    const updated = await this.transitionStatus(
      workItem,
      WorkItemStatus.completed,
      {
        memoryCommitId: commit.id,
        actorId: dto.created_by,
      },
    );

    await this.audit.record({
      projectId: updated.projectId,
      actorId: dto.created_by,
      action: 'work_item.memory_commit.complete',
      resourceType: 'memory_commit',
      resourceId: commit.id,
      metadataJson: {
        workItemId: updated.id,
      },
    });

    return { success: true, data: { workItem: updated, memoryCommit: commit } };
  }

  async applyWorkflowOutcome(params: {
    workItemId: string;
    workflowCode: string;
    runId: string;
    succeeded: boolean;
    artifactId?: string;
  }) {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: params.workItemId },
    });

    if (!workItem) {
      return;
    }

    const nextStatus = params.succeeded
      ? SUCCESS_STATUS_TRANSITIONS[params.workflowCode]
      : WorkItemStatus.blocked;

    if (!nextStatus || workItem.status === nextStatus) {
      return;
    }

    await this.transitionStatus(workItem, nextStatus, {
      workflowCode: params.workflowCode,
      runId: params.runId,
      artifactId: params.artifactId,
      failed: !params.succeeded,
    });
  }

  private async startWorkflowRun(
    workItem: Awaited<ReturnType<WorkItemsService['requireWorkItem']>>,
    workflowCode: string,
    dto: StartWorkflowDto,
  ) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { code: workflowCode },
    });

    if (!definition || !definition.active) {
      throw new NotFoundException('Workflow definition not found or inactive');
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

    const inFlight = await this.prisma.workflowRun.findFirst({
      where: {
        workflowDefinitionId: definition.id,
        workItemId: workItem.id,
        status: {
          in: [
            WorkflowRunStatus.pending,
            WorkflowRunStatus.queued,
            WorkflowRunStatus.running,
            WorkflowRunStatus.retrying,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (inFlight) {
      throw new ConflictException({
        code: 'WORK_ITEM_WORKFLOW_ALREADY_RUNNING',
        workflowRunId: inFlight.id,
        workflowCode,
      });
    }

    const contextPacket = await this.getContextPacket(workItem.id);

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowDefinitionId: definition.id,
        projectId: workItem.projectId,
        workItemId: workItem.id,
        status: WorkflowRunStatus.pending,
        idempotencyKey: dto.idempotencyKey,
        triggeredBy: dto.triggeredBy,
        inputJson: {
          contextPacket: contextPacket.data,
          ...(dto.input ?? {}),
        } as Prisma.InputJsonValue,
        events: {
          create: {
            eventType: 'workflow_run.created',
            payloadJson: {
              workflowCode: workflowCode,
              workItemId: workItem.id,
            },
          },
        },
      },
      include: { workflowDefinition: true },
    });

    await this.audit.record({
      projectId: workItem.projectId,
      actorId: dto.triggeredBy,
      action: 'work_item.workflow.start',
      resourceType: 'workflow_run',
      resourceId: run.id,
      metadataJson: {
        workflowCode,
        workItemId: workItem.id,
      },
    });

    if (definition.executor === WorkflowExecutor.n8n) {
      return this.triggerN8nRun(run.id);
    }

    return run;
  }

  private async triggerN8nRun(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflowDefinition: true },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    const running = await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: WorkflowRunStatus.running,
        startedAt: run.startedAt ?? new Date(),
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
      include: { workflowDefinition: true },
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
        action: 'work_item.workflow.trigger_n8n',
        resourceType: 'workflow_run',
        resourceId: running.id,
        outcome: 'failure',
        reason: serialized.message,
        metadataJson: {
          workflowCode: running.workflowDefinition.code,
          workItemId: running.workItemId,
        },
      });

      throw new BadRequestException({
        code: 'N8N_TRIGGER_FAILED',
        workflowRunId: running.id,
        message: serialized.message,
      });
    }

    return running;
  }

  private async transitionStatus(
    workItem: { id: string; projectId: string; status: WorkItemStatus },
    nextStatus: WorkItemStatus,
    metadata: Record<string, unknown>,
  ) {
    const updated = await this.prisma.workItem.update({
      where: { id: workItem.id },
      data: { status: nextStatus },
    });

    await this.createWorkItemEvent({
      projectId: updated.projectId,
      workItemId: updated.id,
      eventType: 'work_item.status.transition',
      summary: `Work item moved from ${workItem.status} to ${nextStatus}`,
      beforeJson: { status: workItem.status },
      afterJson: { status: nextStatus, ...metadata },
    });

    return updated;
  }

  private assertStatus(current: WorkItemStatus, allowed: WorkItemStatus[]) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Current work item status ${current} does not allow this action`,
      );
    }
  }

  private async requireProject(projectCode: string) {
    const project = await this.prisma.project.findUnique({
      where: { projectCode: projectCode.trim().toUpperCase() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async requireWorkItem(workItemId: string) {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
      include: {
        project: {
          include: {
            techStack: true,
            repositories: true,
            paths: true,
            configFiles: true,
          },
        },
      },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found');
    }

    return workItem;
  }

  private async createWorkItemEvent(args: {
    projectId: string;
    workItemId: string;
    eventType: string;
    summary: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
  }) {
    await this.prisma.memoryEvent.create({
      data: {
        projectId: args.projectId,
        workItemId: args.workItemId,
        eventType: args.eventType,
        summary: args.summary,
        beforeJson: args.beforeJson as Prisma.InputJsonValue | undefined,
        afterJson: args.afterJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async requireFinalDocumentArtifact(
    workItemId: string,
    artifactId?: string,
  ) {
    const artifact = artifactId
      ? await this.prisma.artifact.findFirst({
          where: {
            id: artifactId,
            workItemId,
            artifactType: 'final_document',
            status: { not: 'rejected' },
          },
        })
      : await this.prisma.artifact.findFirst({
          where: {
            workItemId,
            artifactType: 'final_document',
            status: { not: 'rejected' },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!artifact) {
      throw new BadRequestException(
        'Human approval for implementation requires a final_document artifact',
      );
    }

    return artifact;
  }

  private async assertImplementationPrerequisites(
    workItem: Awaited<ReturnType<WorkItemsService['requireWorkItem']>>,
  ) {
    if (
      !(
        [ProjectStatus.active, ProjectStatus.indexed] as ProjectStatus[]
      ).includes(workItem.project.status)
    ) {
      throw new BadRequestException(
        'Project must be indexed or active before implementation planning',
      );
    }

    const finalDocument = await this.requireFinalDocumentArtifact(workItem.id);

    const approval = await this.prisma.humanApproval.findFirst({
      where: {
        workItemId: workItem.id,
        decision: {
          in: ['approved_for_implementation', 'approved_with_waiver'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!approval) {
      throw new BadRequestException(
        'Implementation planning requires human approval',
      );
    }

    const openQuestions = this.blockingQuestions(
      workItem.openQuestionsJson,
      finalDocument.contentJson,
    );
    if (
      openQuestions.length > 0 &&
      approval.decision !== 'approved_with_waiver'
    ) {
      throw new BadRequestException({
        code: 'OPEN_QUESTIONS_NOT_WAIVED',
        message:
          'Open questions must be resolved or explicitly waived before implementation.',
        openQuestions,
      });
    }
  }

  private openQuestions(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private blockingQuestions(
    workItemQuestions: unknown,
    artifactContent: unknown,
  ): string[] {
    const content = this.objectRecord(artifactContent) ?? {};
    return [
      ...this.openQuestions(workItemQuestions),
      ...this.openQuestions(content.openQuestions),
      ...this.openQuestions(content.open_questions),
      ...this.openQuestions(content.unknowns),
      ...this.openQuestions(content.remainingQuestions),
    ].filter(
      (question, index, questions) => questions.indexOf(question) === index,
    );
  }

  private objectRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private bumpRiskLevel(riskLevel: string): string {
    const levels = ['low', 'medium', 'high', 'critical'];
    const index = levels.indexOf(riskLevel);
    return levels[Math.min(index < 0 ? 2 : index + 1, levels.length - 1)];
  }

  private serializeError(error: unknown): { message: string; name?: string } {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }

    return { message: 'Unknown n8n trigger error' };
  }
}
