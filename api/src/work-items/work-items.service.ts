import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkItemStatus } from '../generated/prisma/enums';
import { CreateWorkItemDto } from './dto/create-work-item.dto';

const SUCCESS_STATUS_TRANSITIONS: Record<string, WorkItemStatus> = {
  'task.analyze': WorkItemStatus.research_ready,
  'research.run': WorkItemStatus.research_ready,
  'document.generate_spec': WorkItemStatus.spec_review,
  'document.review': WorkItemStatus.needs_human_approval,
  'document.finalize': WorkItemStatus.approved_for_implementation,
  'document.revise': WorkItemStatus.spec_review,
};

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
        metadataJson: dto.metadata,
      },
    });

    await this.prisma.memoryEvent.create({
      data: {
        projectId: project.id,
        workItemId: workItem.id,
        eventType: 'work_item.created',
        summary: `Work item ${workItem.title} created`,
        afterJson: {
          workItemId: workItem.id,
          status: workItem.status,
        },
      },
    });

    await this.audit.record({
      projectId: project.id,
      actorId: dto.requested_by,
      action: 'work_item.create',
      resourceType: 'work_item',
      resourceId: workItem.id,
      metadataJson: {
        requestType: dto.request_type,
      },
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

    const updated = await this.prisma.workItem.update({
      where: { id: workItem.id },
      data: { status: nextStatus },
    });

    await this.prisma.memoryEvent.create({
      data: {
        projectId: updated.projectId,
        workItemId: updated.id,
        eventType: params.succeeded
          ? 'work_item.workflow.transition.succeeded'
          : 'work_item.workflow.transition.failed',
        summary: `Workflow ${params.workflowCode} moved work item to ${nextStatus}`,
        beforeJson: { status: workItem.status },
        afterJson: {
          status: nextStatus,
          runId: params.runId,
          artifactId: params.artifactId,
        },
      },
    });

    await this.audit.record({
      projectId: updated.projectId,
      action: 'work_item.status.transition',
      resourceType: 'work_item',
      resourceId: updated.id,
      metadataJson: {
        workflowCode: params.workflowCode,
        runId: params.runId,
        beforeStatus: workItem.status,
        afterStatus: nextStatus,
        artifactId: params.artifactId,
      },
    });
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
}
