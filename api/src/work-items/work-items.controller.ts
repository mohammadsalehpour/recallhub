import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
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
}
