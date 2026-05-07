import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiAuthGuard } from '../auth/api-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateConfigFileDto } from './dto/create-config-file.dto';
import { CreateProjectPathDto } from './dto/create-project-path.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { CreateTechStackItemDto } from './dto/create-project.dto';
import { UpdateConfigFileDto } from './dto/update-config-file.dto';
import { UpdateProjectPathDto } from './dto/update-project-path.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('project.read')
  listProjects() {
    return this.projectsService.listProjects();
  }

  @Post()
  @RequirePermissions('project.create')
  createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }

  @Get(':projectCode')
  @RequirePermissions('project.read')
  getProject(@Param('projectCode') projectCode: string) {
    return this.projectsService.getProjectByCode(projectCode);
  }

  @Patch(':projectCode')
  @RequirePermissions('project.update')
  updateProject(
    @Param('projectCode') projectCode: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(projectCode, dto);
  }

  @Post(':projectCode/archive')
  @RequirePermissions('project.archive')
  archiveProject(@Param('projectCode') projectCode: string) {
    return this.projectsService.archiveProject(projectCode);
  }

  @Get(':projectCode/tech-stack')
  @RequirePermissions('project.read')
  listTechStack(@Param('projectCode') projectCode: string) {
    return this.projectsService.listTechStack(projectCode);
  }

  @Post(':projectCode/tech-stack')
  @RequirePermissions('project.update')
  createTechStack(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateTechStackItemDto,
  ) {
    return this.projectsService.createTechStack(projectCode, dto);
  }

  @Patch(':projectCode/tech-stack/:id')
  @RequirePermissions('project.update')
  updateTechStack(
    @Param('projectCode') projectCode: string,
    @Param('id') id: string,
    @Body() dto: UpdateTechStackDto,
  ) {
    return this.projectsService.updateTechStack(projectCode, id, dto);
  }

  @Post(':projectCode/tech-stack/:id/approve-detected')
  @RequirePermissions('project.update')
  approveDetectedTechStack(
    @Param('projectCode') projectCode: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.approveDetectedTechStack(projectCode, id);
  }

  @Post(':projectCode/tech-stack/:id/reject-detected')
  @RequirePermissions('project.update')
  rejectDetectedTechStack(
    @Param('projectCode') projectCode: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.rejectDetectedTechStack(projectCode, id);
  }

  @Get(':projectCode/repositories')
  @RequirePermissions('project.read')
  listRepositories(@Param('projectCode') projectCode: string) {
    return this.projectsService.listRepositories(projectCode);
  }

  @Post(':projectCode/repositories')
  @RequirePermissions('project.configure_repository')
  createRepository(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateRepositoryDto,
  ) {
    return this.projectsService.createRepository(projectCode, dto);
  }

  @Post(':projectCode/repositories/:repoId/validate')
  @RequirePermissions('project.configure_repository')
  validateRepository(
    @Param('projectCode') projectCode: string,
    @Param('repoId') repoId: string,
  ) {
    return this.projectsService.validateRepository(projectCode, repoId);
  }

  @Get(':projectCode/paths')
  @RequirePermissions('project.read')
  listPaths(@Param('projectCode') projectCode: string) {
    return this.projectsService.listPaths(projectCode);
  }

  @Post(':projectCode/paths')
  @RequirePermissions('project.configure_repository')
  createPath(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateProjectPathDto,
  ) {
    return this.projectsService.createPath(projectCode, dto);
  }

  @Patch(':projectCode/paths/:pathId')
  @RequirePermissions('project.configure_repository')
  updatePath(
    @Param('projectCode') projectCode: string,
    @Param('pathId') pathId: string,
    @Body() dto: UpdateProjectPathDto,
  ) {
    return this.projectsService.updatePath(projectCode, pathId, dto);
  }

  @Delete(':projectCode/paths/:pathId')
  @RequirePermissions('project.configure_repository')
  deletePath(
    @Param('projectCode') projectCode: string,
    @Param('pathId') pathId: string,
  ) {
    return this.projectsService.deletePath(projectCode, pathId);
  }

  @Get(':projectCode/config-files')
  @RequirePermissions('project.read')
  listConfigFiles(@Param('projectCode') projectCode: string) {
    return this.projectsService.listConfigFiles(projectCode);
  }

  @Post(':projectCode/config-files')
  @RequirePermissions('project.configure_repository')
  createConfigFile(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateConfigFileDto,
  ) {
    return this.projectsService.createConfigFile(projectCode, dto);
  }

  @Patch(':projectCode/config-files/:id')
  @RequirePermissions('project.configure_repository')
  updateConfigFile(
    @Param('projectCode') projectCode: string,
    @Param('id') id: string,
    @Body() dto: UpdateConfigFileDto,
  ) {
    return this.projectsService.updateConfigFile(projectCode, id, dto);
  }
}
