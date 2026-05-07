import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { CreateMemoryCommitDto } from './dto/create-memory-commit.dto';
import { HumanApprovalDto } from './dto/human-approval.dto';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { WorkItemsService } from './work-items.service';

@Controller()
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post('projects/:projectCode/work-items')
  @RequirePermissions('work_item.create')
  create(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateWorkItemDto,
  ) {
    return this.workItemsService.create(projectCode, dto);
  }

  @Get('projects/:projectCode/work-items')
  @RequirePermissions('work_item.read')
  list(@Param('projectCode') projectCode: string) {
    return this.workItemsService.list(projectCode);
  }

  @Get('work-items/:workItemId/context-packet')
  @RequirePermissions('work_item.read')
  contextPacket(@Param('workItemId') workItemId: string) {
    return this.workItemsService.getContextPacket(workItemId);
  }

  @Get('work-items/:workItemId/status')
  @RequirePermissions('work_item.read')
  status(@Param('workItemId') workItemId: string) {
    return this.workItemsService.getStatus(workItemId);
  }

  @Get('work-items/:workItemId/artifacts')
  @RequirePermissions('work_item.read')
  artifacts(@Param('workItemId') workItemId: string) {
    return this.workItemsService.listArtifacts(workItemId);
  }

  @Post('work-items/:workItemId/analyze')
  @RequirePermissions('work_item.analyze')
  analyze(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.analyze(workItemId, dto);
  }

  @Post('work-items/:workItemId/start-research')
  @RequirePermissions('work_item.research')
  startResearchDocumented(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startResearch(workItemId, dto);
  }

  @Post('work-items/:workItemId/research/start')
  @RequirePermissions('work_item.research')
  startResearch(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startResearch(workItemId, dto);
  }

  @Post('work-items/:workItemId/generate-development-spec')
  @RequirePermissions('work_item.generate_spec')
  generateDevelopmentSpec(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startSpecGeneration(workItemId, dto);
  }

  @Post('work-items/:workItemId/spec/start')
  @RequirePermissions('work_item.generate_spec')
  startSpec(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startSpecGeneration(workItemId, dto);
  }

  @Post('work-items/:workItemId/review-document')
  @RequirePermissions('work_item.review')
  reviewDocument(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.reviewDocument(workItemId, dto);
  }

  @Post('work-items/:workItemId/finalize-document')
  @RequirePermissions('work_item.review')
  finalizeDocument(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.finalizeDocument(workItemId, dto);
  }

  @Post('work-items/:workItemId/human-approval')
  @RequirePermissions('work_item.approve')
  humanApproval(
    @Param('workItemId') workItemId: string,
    @Body() dto: HumanApprovalDto,
  ) {
    return this.workItemsService.submitHumanApproval(workItemId, dto);
  }

  @Post('work-items/:workItemId/create-implementation-plan')
  @RequirePermissions('work_item.implement')
  createImplementationPlan(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.createImplementationPlan(workItemId, dto);
  }

  @Post('work-items/:workItemId/simulate-execution')
  @RequirePermissions('work_item.validate')
  simulateExecution(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.simulateExecution(workItemId, dto);
  }

  @Post('work-items/:workItemId/complete-memory-commit')
  @RequirePermissions('memory.commit')
  completeMemoryCommit(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateMemoryCommitDto,
  ) {
    return this.workItemsService.completeWithMemoryCommit(workItemId, dto);
  }

  @Post('work-items/:workItemId/memory-commit')
  @RequirePermissions('memory.commit')
  memoryCommit(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateMemoryCommitDto,
  ) {
    return this.workItemsService.completeWithMemoryCommit(workItemId, dto);
  }
}
