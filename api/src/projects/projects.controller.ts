import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateConfigFileDto } from './dto/create-config-file.dto';
import { CreateProjectPathDto } from './dto/create-project-path.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects() {
    return this.projectsService.listProjects();
  }

  @Post()
  createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }

  @Get(':projectCode')
  getProject(@Param('projectCode') projectCode: string) {
    return this.projectsService.getProjectByCode(projectCode);
  }

  @Get(':projectCode/tech-stack')
  listTechStack(@Param('projectCode') projectCode: string) {
    return this.projectsService.listTechStack(projectCode);
  }

  @Get(':projectCode/repositories')
  listRepositories(@Param('projectCode') projectCode: string) {
    return this.projectsService.listRepositories(projectCode);
  }

  @Post(':projectCode/repositories')
  createRepository(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateRepositoryDto,
  ) {
    return this.projectsService.createRepository(projectCode, dto);
  }

  @Post(':projectCode/repositories/:repoId/validate')
  validateRepository(
    @Param('projectCode') projectCode: string,
    @Param('repoId') repoId: string,
  ) {
    return this.projectsService.validateRepository(projectCode, repoId);
  }

  @Get(':projectCode/paths')
  listPaths(@Param('projectCode') projectCode: string) {
    return this.projectsService.listPaths(projectCode);
  }

  @Post(':projectCode/paths')
  createPath(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateProjectPathDto,
  ) {
    return this.projectsService.createPath(projectCode, dto);
  }

  @Get(':projectCode/config-files')
  listConfigFiles(@Param('projectCode') projectCode: string) {
    return this.projectsService.listConfigFiles(projectCode);
  }

  @Post(':projectCode/config-files')
  createConfigFile(
    @Param('projectCode') projectCode: string,
    @Body() dto: CreateConfigFileDto,
  ) {
    return this.projectsService.createConfigFile(projectCode, dto);
  }
}
