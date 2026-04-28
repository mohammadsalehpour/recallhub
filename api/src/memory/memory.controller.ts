import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { ProjectSyncService } from './project-sync.service';

@Controller('projects/:projectCode')
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly projectSyncService: ProjectSyncService,
  ) {}

  @Post('sync')
  syncProject(
    @Param('projectCode') projectCode: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.projectSyncService.syncProject(projectCode, idempotencyKey);
  }

  @Get('modules')
  listModules(@Param('projectCode') projectCode: string) {
    return this.memoryService.listModules(projectCode);
  }

  @Get('files')
  listFiles(@Param('projectCode') projectCode: string) {
    return this.memoryService.listFiles(projectCode);
  }

  @Get('memory-chunks')
  listMemoryChunks(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryChunks(projectCode);
  }

  @Get('memory-events')
  listMemoryEvents(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryEvents(projectCode);
  }

  @Get('memory-commits')
  listMemoryCommits(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryCommits(projectCode);
  }
}
