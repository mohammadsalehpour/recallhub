import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermissions('audit.read')
  listLogs(
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.listLogs({
      projectId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
