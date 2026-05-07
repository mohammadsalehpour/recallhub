import { Injectable } from '@nestjs/common';
import { WorkflowRunStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_STALE_MINUTES = 30;

@Injectable()
export class StabilizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthSnapshot() {
    const [projects, workflowRuns, staleRuns] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.countStaleRuns(DEFAULT_STALE_MINUTES),
    ]);

    return {
      projects,
      workflow_runs_by_status: workflowRuns.map((row) => ({
        status: row.status,
        count: row._count.status,
      })),
      stale_workflow_runs: staleRuns,
    };
  }

  async reconcileStaleWorkflowRuns(staleMinutes = DEFAULT_STALE_MINUTES) {
    const staleSince = new Date(Date.now() - staleMinutes * 60_000);
    const staleRuns = await this.prisma.workflowRun.findMany({
      where: {
        status: { in: [WorkflowRunStatus.pending, WorkflowRunStatus.running] },
        createdAt: { lt: staleSince },
      },
      include: { workflowDefinition: true },
      take: 500,
      orderBy: { createdAt: 'asc' },
    });

    if (staleRuns.length === 0) {
      return { success: true, data: { updated: 0, staleMinutes } };
    }

    await this.prisma.$transaction(
      staleRuns.map((run) =>
        this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: WorkflowRunStatus.callback_missing,
            finishedAt: new Date(),
            errorJson: {
              code: 'CALLBACK_MISSING_TIMEOUT',
              staleMinutes,
              staleSince: staleSince.toISOString(),
            },
            events: {
              create: {
                eventType: 'workflow_run.reconciled.callback_missing',
                payloadJson: {
                  workflowCode: run.workflowDefinition.code,
                  staleMinutes,
                },
              },
            },
          },
        }),
      ),
    );

    return {
      success: true,
      data: {
        updated: staleRuns.length,
        staleMinutes,
        runIds: staleRuns.map((run) => run.id),
      },
    };
  }

  private async countStaleRuns(staleMinutes: number) {
    const staleSince = new Date(Date.now() - staleMinutes * 60_000);
    return this.prisma.workflowRun.count({
      where: {
        status: { in: [WorkflowRunStatus.pending, WorkflowRunStatus.running] },
        createdAt: { lt: staleSince },
      },
    });
  }
}
