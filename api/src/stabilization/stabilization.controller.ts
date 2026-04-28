import { Controller, Get, Post, Query } from '@nestjs/common';
import { StabilizationService } from './stabilization.service';

@Controller()
export class StabilizationController {
  constructor(private readonly stabilizationService: StabilizationService) {}

  @Get('health/stability')
  async health() {
    return {
      success: true,
      data: await this.stabilizationService.getHealthSnapshot(),
    };
  }

  @Post('admin/reconcile/workflow-runs')
  reconcile(@Query('stale_minutes') staleMinutes?: string) {
    const parsed = staleMinutes ? Number(staleMinutes) : undefined;
    return this.stabilizationService.reconcileStaleWorkflowRuns(
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}
