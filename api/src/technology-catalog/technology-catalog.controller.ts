import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TechnologyCatalogQueryDto } from './dto/technology-catalog-query.dto';
import { TechnologyCatalogService } from './technology-catalog.service';

@Controller('technology-catalog')
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class TechnologyCatalogController {
  constructor(private readonly service: TechnologyCatalogService) {}

  @Get()
  @RequirePermissions('project.read')
  search(@Query() query: TechnologyCatalogQueryDto) {
    return this.service.search(query);
  }

  @Get(':id/versions')
  @RequirePermissions('project.read')
  versions(@Param('id') id: string) {
    return this.service.versions(id);
  }
}
