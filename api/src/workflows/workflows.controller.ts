import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('workflows')
  @RequirePermissions('workflow.read')
  listDefinitions() {
    return this.workflowsService.listDefinitions();
  }

  @Post('workflows/:code/run')
  @RequirePermissions('workflow.run')
  runWorkflow(@Param('code') code: string, @Body() dto: RunWorkflowDto) {
    return this.workflowsService.createRun(code, dto);
  }

  @Get('workflow-runs')
  @RequirePermissions('workflow.read')
  listRuns() {
    return this.workflowsService.listRuns();
  }

  @Get('workflow-runs/:runId')
  @RequirePermissions('workflow.read')
  getRun(@Param('runId') runId: string) {
    return this.workflowsService.getRun(runId);
  }

  @Get('workflow-runs/:runId/events')
  @RequirePermissions('workflow.read')
  listRunEvents(@Param('runId') runId: string) {
    return this.workflowsService.listRunEvents(runId);
  }

  @Post('workflow-runs/:runId/retry')
  @RequirePermissions('workflow.retry')
  retryRun(@Param('runId') runId: string) {
    return this.workflowsService.retryRun(runId);
  }

  @Post('workflow-runs/:runId/cancel')
  @RequirePermissions('workflow.cancel')
  cancelRun(@Param('runId') runId: string) {
    return this.workflowsService.cancelRun(runId);
  }
}
