import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequireRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StabilizationService } from './stabilization.service';

@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard, RolesGuard)
export class StabilizationController {
  constructor(private readonly stabilizationService: StabilizationService) {}

  @Get('health/stability')
  @RequirePermissions('audit.read')
  async health() {
    return {
      success: true,
      data: await this.stabilizationService.getHealthSnapshot(),
    };
  }

  @Post('admin/reconcile/workflow-runs')
  @RequireRoles('admin', 'ops')
  @RequirePermissions('settings.write')
  reconcile(@Query('stale_minutes') staleMinutes?: string) {
    const parsed = staleMinutes ? Number(staleMinutes) : undefined;
    return this.stabilizationService.reconcileStaleWorkflowRuns(
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}
