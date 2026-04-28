import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { WorkflowRunStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { N8nCallbackDto } from './dto/n8n-callback.dto';
import { WorkItemsService } from '../../work-items/work-items.service';

@Injectable()
export class N8nCallbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workItemsService: WorkItemsService,
  ) {}

  async handleCallback(dto: N8nCallbackDto) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: dto.runId },
      include: { workflowDefinition: true },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    if (run.workflowDefinition.code !== dto.workflowCode) {
      throw new ConflictException('Callback workflowCode does not match run');
    }

    const terminalStatuses = new Set<WorkflowRunStatus>([
      WorkflowRunStatus.succeeded,
      WorkflowRunStatus.failed,
      WorkflowRunStatus.cancelled,
      WorkflowRunStatus.timed_out,
    ]);

    if (terminalStatuses.has(run.status)) {
      return { success: true, data: { alreadyProcessed: true, runId: run.id } };
    }

    if (dto.artifact && !run.projectId) {
      throw new ConflictException(
        'Artifact callback requires a project-bound run',
      );
    }

    const artifact = dto.artifact
      ? await this.prisma.artifact.create({
          data: {
            projectId: run.projectId!,
            workItemId: run.workItemId,
            artifactType: dto.artifact.type,
            title: dto.artifact.title ?? dto.artifact.type,
            contentMarkdown: dto.artifact.contentMarkdown,
            contentJson: dto.artifact.contentJson as
              | Prisma.InputJsonValue
              | undefined,
            source: 'workflow',
            status: dto.status === 'succeeded' ? 'approved' : 'rejected',
          },
        })
      : null;

    const updated = await this.prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status:
          dto.status === 'succeeded'
            ? WorkflowRunStatus.succeeded
            : WorkflowRunStatus.failed,
        n8nExecutionId: dto.n8nExecutionId,
        outputJson: dto.artifact
          ? ({
              artifactId: artifact?.id,
              artifact: dto.artifact,
            } as unknown as Prisma.InputJsonValue)
          : undefined,
        errorJson: dto.error as Prisma.InputJsonValue | undefined,
        finishedAt: new Date(),
        events: {
          create: {
            eventType: `n8n.callback.${dto.status}`,
            payloadJson: {
              n8nExecutionId: dto.n8nExecutionId,
              artifactId: artifact?.id,
            },
          },
        },
      },
      include: { events: true },
    });

    if (run.workItemId) {
      await this.workItemsService.applyWorkflowOutcome({
        workItemId: run.workItemId,
        workflowCode: run.workflowDefinition.code,
        runId: run.id,
        succeeded: dto.status === 'succeeded',
        artifactId: artifact?.id,
      });
    }

    return { success: true, data: { workflowRun: updated, artifact } };
  }
}
