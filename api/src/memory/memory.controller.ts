import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { MemoryService } from './memory.service';
import { ProjectSyncService } from './project-sync.service';

@Controller('projects/:projectCode')
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly projectSyncService: ProjectSyncService,
  ) {}

  @Post('sync')
  @RequirePermissions('project.sync')
  syncProject(
    @Param('projectCode') projectCode: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.projectSyncService.syncProject(projectCode, idempotencyKey);
  }

  @Get('sync-runs')
  @RequirePermissions('workflow.read')
  listSyncRuns(@Param('projectCode') projectCode: string) {
    return this.memoryService.listSyncRuns(projectCode);
  }

  @Get('modules')
  @RequirePermissions('memory.read')
  listModules(@Param('projectCode') projectCode: string) {
    return this.memoryService.listModules(projectCode);
  }

  @Get('files')
  @RequirePermissions('memory.read')
  listFiles(@Param('projectCode') projectCode: string) {
    return this.memoryService.listFiles(projectCode);
  }

  @Get('memory-chunks')
  @RequirePermissions('memory.read')
  listMemoryChunks(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryChunks(projectCode);
  }

  @Get('memory-events')
  @RequirePermissions('memory.read')
  listMemoryEvents(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryEvents(projectCode);
  }

  @Get('memory-commits')
  @RequirePermissions('memory.read')
  listMemoryCommits(@Param('projectCode') projectCode: string) {
    return this.memoryService.listMemoryCommits(projectCode);
  }

  @Get('search-memory')
  @RequirePermissions('memory.read')
  searchMemory(
    @Param('projectCode') projectCode: string,
    @Query('q') query?: string,
  ) {
    return this.memoryService.searchMemory(projectCode, query);
  }
}
