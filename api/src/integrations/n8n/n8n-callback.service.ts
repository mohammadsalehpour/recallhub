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
import { ArtifactValidatorService } from '../../artifacts/artifact-validator.service';

type CallbackVerification = {
  timestamp: string;
  signature: string;
};

@Injectable()
export class N8nCallbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workItemsService: WorkItemsService,
    private readonly artifactValidator: ArtifactValidatorService,
  ) {}

  async handleCallback(dto: N8nCallbackDto, verification: CallbackVerification) {
    this.artifactValidator.validateCallbackEnvelope(dto);

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

    const receipt = await this.recordCallbackReceipt(dto, verification);
    if (receipt === 'duplicate') {
      return {
        success: true,
        data: { alreadyProcessed: true, replayed: true, runId: run.id },
      };
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

    if (
      artifact &&
      run.workItemId &&
      run.workflowDefinition.code === 'document.review'
    ) {
      const contentJson = this.objectContent(dto.artifact?.contentJson);
      await this.prisma.documentReview.create({
        data: {
          projectId: run.projectId!,
          workItemId: run.workItemId,
          artifactId: artifact.id,
          reviewerRole: this.stringValue(contentJson.reviewerRole) ?? 'n8n',
          decision: this.stringValue(contentJson.decision) ?? 'approved',
          score: this.numberValue(contentJson.score),
          notesMd:
            this.stringValue(contentJson.notesMd) ??
            dto.artifact?.contentMarkdown,
          blockersJson: this.arrayValue(contentJson.blockers) as
            | Prisma.InputJsonValue
            | undefined,
          warningsJson: this.arrayValue(contentJson.warnings) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
    }

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

  private async recordCallbackReceipt(
    dto: N8nCallbackDto,
    verification: CallbackVerification,
  ): Promise<'recorded' | 'duplicate'> {
    try {
      await this.prisma.n8nCallbackReceipt.create({
        data: {
          runId: dto.runId,
          workflowCode: dto.workflowCode,
          signature: verification.signature,
          timestamp: verification.timestamp,
        },
      });
      return 'recorded';
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return 'duplicate';
      }

      throw error;
    }
  }

  private objectContent(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private arrayValue(value: unknown): unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
