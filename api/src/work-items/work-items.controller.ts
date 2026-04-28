import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { CreateMemoryCommitDto } from './dto/create-memory-commit.dto';
import { HumanApprovalDto } from './dto/human-approval.dto';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { WorkItemsService } from './work-items.service';

@Controller()
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post('projects/:projectCode/work-items')
  create(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateWorkItemDto,
  ) {
    return this.workItemsService.create(projectCode, dto);
  }

  @Get('projects/:projectCode/work-items')
  list(@Param('projectCode') projectCode: string) {
    return this.workItemsService.list(projectCode);
  }

  @Get('work-items/:workItemId/context-packet')
  contextPacket(@Param('workItemId') workItemId: string) {
    return this.workItemsService.getContextPacket(workItemId);
  }

  @Post('work-items/:workItemId/research/start')
  startResearch(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startResearch(workItemId, dto);
  }

  @Post('work-items/:workItemId/spec/start')
  startSpec(
    @Param('workItemId') workItemId: string,
    @Body() dto: StartWorkflowDto,
  ) {
    return this.workItemsService.startSpecGeneration(workItemId, dto);
  }

  @Post('work-items/:workItemId/human-approval')
  humanApproval(
    @Param('workItemId') workItemId: string,
    @Body() dto: HumanApprovalDto,
  ) {
    return this.workItemsService.submitHumanApproval(workItemId, dto);
  }

  @Post('work-items/:workItemId/memory-commit')
  memoryCommit(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateMemoryCommitDto,
  ) {
    return this.workItemsService.completeWithMemoryCommit(workItemId, dto);
  }
}
