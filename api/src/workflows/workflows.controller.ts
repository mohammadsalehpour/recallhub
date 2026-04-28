import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('workflows')
  listDefinitions() {
    return this.workflowsService.listDefinitions();
  }

  @Post('workflows/:code/run')
  runWorkflow(@Param('code') code: string, @Body() dto: RunWorkflowDto) {
    return this.workflowsService.createRun(code, dto);
  }

  @Get('workflow-runs')
  listRuns() {
    return this.workflowsService.listRuns();
  }

  @Get('workflow-runs/:runId')
  getRun(@Param('runId') runId: string) {
    return this.workflowsService.getRun(runId);
  }

  @Get('workflow-runs/:runId/events')
  listRunEvents(@Param('runId') runId: string) {
    return this.workflowsService.listRunEvents(runId);
  }
}
