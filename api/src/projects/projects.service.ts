import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryPathResolverService } from '../repository/repository-path-resolver.service';
import {
  ProjectStatus,
  RepositoryStatus,
  TechStatus,
} from '../generated/prisma/enums';
import { CreateConfigFileDto } from './dto/create-config-file.dto';
import { CreateProjectPathDto } from './dto/create-project-path.dto';
import {
  CreateProjectDto,
  CreateTechStackItemDto,
} from './dto/create-project.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateConfigFileDto } from './dto/update-config-file.dto';
import { UpdateProjectPathDto } from './dto/update-project-path.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pathResolver: RepositoryPathResolverService,
  ) {}

  listProjects() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { techStack: true, repositories: true },
    });
  }

  async createProject(dto: CreateProjectDto) {
    const projectCode = this.normalizeProjectCode(dto.project_code);

    if (!dto.tech_stack.some((item) => item.source === 'declared')) {
      throw new BadRequestException(
        'At least one declared tech_stack item is required',
      );
    }

    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            projectCode,
            name: dto.name,
            description: dto.description,
            businessDomain: dto.business_domain,
            status: ProjectStatus.configured,
            primaryFrameworkName: dto.primary_framework.name,
            primaryFrameworkVersion: dto.primary_framework.version,
            techStack: {
              create: dto.tech_stack.map((item) => ({
                category: item.category,
                name: item.name,
                version: item.version,
                source: item.source,
                status:
                  item.source === 'detected'
                    ? TechStatus.suggested
                    : TechStatus.active,
                notes: item.notes,
              })),
            },
          },
          include: { techStack: true },
        });

        await tx.auditLog.create({
          data: {
            projectId: created.id,
            action: 'project.create',
            resourceType: 'project',
            resourceId: created.id,
            outcome: 'success',
            metadataJson: { projectCode },
          },
        });

        return created;
      });

      return { success: true, data: project };
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(`Project ${projectCode} already exists`);
      }

      throw error;
    }
  }

  async getProjectByCode(projectCode: string) {
    const project = await this.prisma.project.findUnique({
      where: { projectCode: this.normalizeProjectCode(projectCode) },
      include: {
        techStack: true,
        repositories: true,
        paths: true,
        configFiles: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return { success: true, data: project };
  }

  async updateProject(projectCode: string, dto: UpdateProjectDto) {
    const project = await this.requireProject(projectCode);
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        name: dto.name,
        description: dto.description,
        businessDomain: dto.business_domain,
        primaryFrameworkName: dto.primary_framework?.name,
        primaryFrameworkVersion: dto.primary_framework?.version,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.update',
      resourceType: 'project',
      resourceId: project.id,
      metadataJson: { fields: Object.keys(dto) },
    });

    return { success: true, data: updated };
  }

  async archiveProject(projectCode: string) {
    const project = await this.requireProject(projectCode);
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.archived },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.archive',
      resourceType: 'project',
      resourceId: project.id,
    });

    return { success: true, data: updated };
  }

  async listTechStack(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectTechStack.findMany({
      where: { projectId: project.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createTechStack(projectCode: string, dto: CreateTechStackItemDto) {
    const project = await this.requireProject(projectCode);
    const created = await this.prisma.projectTechStack.create({
      data: {
        projectId: project.id,
        category: dto.category,
        name: dto.name,
        version: dto.version,
        source: dto.source,
        status:
          dto.source === 'detected' ? TechStatus.suggested : TechStatus.active,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.tech_stack.create',
      resourceType: 'project_tech_stack',
      resourceId: created.id,
      metadataJson: { source: created.source, status: created.status },
    });

    return { success: true, data: created };
  }

  async updateTechStack(
    projectCode: string,
    id: string,
    dto: UpdateTechStackDto,
  ) {
    const project = await this.requireProject(projectCode);
    await this.requireTechStack(project.id, id);

    const updated = await this.prisma.projectTechStack.update({
      where: { id },
      data: {
        category: dto.category,
        name: dto.name,
        version: dto.version,
        source: dto.source,
        confidence: dto.confidence,
        status: dto.status,
        notes: dto.notes,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.tech_stack.update',
      resourceType: 'project_tech_stack',
      resourceId: updated.id,
      metadataJson: { fields: Object.keys(dto) },
    });

    return { success: true, data: updated };
  }

  async approveDetectedTechStack(projectCode: string, id: string) {
    const project = await this.requireProject(projectCode);
    const item = await this.requireTechStack(project.id, id);
    if (item.source !== 'detected') {
      throw new BadRequestException(
        'Only detected tech stack items can be approved',
      );
    }

    const updated = await this.prisma.projectTechStack.update({
      where: { id },
      data: { status: TechStatus.active },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.tech_stack.approve_detected',
      resourceType: 'project_tech_stack',
      resourceId: updated.id,
    });

    return { success: true, data: updated };
  }

  async rejectDetectedTechStack(projectCode: string, id: string) {
    const project = await this.requireProject(projectCode);
    const item = await this.requireTechStack(project.id, id);
    if (item.source !== 'detected') {
      throw new BadRequestException(
        'Only detected tech stack items can be rejected',
      );
    }

    const updated = await this.prisma.projectTechStack.update({
      where: { id },
      data: { status: TechStatus.rejected },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.tech_stack.reject_detected',
      resourceType: 'project_tech_stack',
      resourceId: updated.id,
    });

    return { success: true, data: updated };
  }

  async listRepositories(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectRepository.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRepository(projectCode: string, dto: CreateRepositoryDto) {
    const project = await this.requireProject(projectCode);

    if (dto.locator_type !== 'local_path') {
      throw new BadRequestException(
        'MVP supports only local_path repositories',
      );
    }

    const repoRoot = this.pathResolver.resolveUserPath(dto.repo_root);

    const repository = await this.prisma.projectRepository.create({
      data: {
        projectId: project.id,
        repoName: dto.repo_name,
        locatorType: dto.locator_type,
        repoRoot,
        defaultBranch: dto.default_branch,
        isPrimary: dto.is_primary ?? false,
        status: RepositoryStatus.valid,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.repository.create',
      resourceType: 'project_repository',
      resourceId: repository.id,
      metadataJson: { repoRoot },
    });

    return { success: true, data: repository };
  }

  async validateRepository(projectCode: string, repoId: string) {
    const project = await this.requireProject(projectCode);
    const repository = await this.prisma.projectRepository.findFirst({
      where: { id: repoId, projectId: project.id },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    const repoRoot = this.pathResolver.resolveUserPath(repository.repoRoot);
    const updated = await this.prisma.projectRepository.update({
      where: { id: repository.id },
      data: {
        repoRoot,
        status: RepositoryStatus.valid,
        validationErrorsJson: undefined,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.repository.validate',
      resourceType: 'project_repository',
      resourceId: repository.id,
    });

    return { success: true, data: updated };
  }

  async listPaths(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectPath.findMany({
      where: { projectId: project.id },
      orderBy: { path: 'asc' },
    });
  }

  async createPath(projectCode: string, dto: CreateProjectPathDto) {
    const project = await this.requireProject(projectCode);
    await this.requireRepository(project.id, dto.repository_id);

    const path = await this.prisma.projectPath.create({
      data: {
        projectId: project.id,
        repositoryId: dto.repository_id,
        path: dto.path,
        pathType: dto.path_type,
        label: dto.label,
        isRequired: dto.is_required ?? false,
        scanPolicy: dto.scan_policy,
        ownership: dto.ownership,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.path.create',
      resourceType: 'project_path',
      resourceId: path.id,
    });

    return { success: true, data: path };
  }

  async updatePath(
    projectCode: string,
    pathId: string,
    dto: UpdateProjectPathDto,
  ) {
    const project = await this.requireProject(projectCode);
    await this.requirePath(project.id, pathId);

    const updated = await this.prisma.projectPath.update({
      where: { id: pathId },
      data: {
        path: dto.path,
        pathType: dto.path_type,
        label: dto.label,
        isRequired: dto.is_required,
        scanPolicy: dto.scan_policy,
        ownership: dto.ownership,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.path.update',
      resourceType: 'project_path',
      resourceId: updated.id,
      metadataJson: { fields: Object.keys(dto) },
    });

    return { success: true, data: updated };
  }

  async deletePath(projectCode: string, pathId: string) {
    const project = await this.requireProject(projectCode);
    await this.requirePath(project.id, pathId);

    const deleted = await this.prisma.projectPath.delete({
      where: { id: pathId },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.path.delete',
      resourceType: 'project_path',
      resourceId: deleted.id,
    });

    return { success: true, data: deleted };
  }

  async listConfigFiles(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectConfigFile.findMany({
      where: { projectId: project.id },
      orderBy: { relativePath: 'asc' },
    });
  }

  async createConfigFile(projectCode: string, dto: CreateConfigFileDto) {
    const project = await this.requireProject(projectCode);
    await this.requireRepository(project.id, dto.repository_id);

    const configFile = await this.prisma.projectConfigFile.create({
      data: {
        projectId: project.id,
        repositoryId: dto.repository_id,
        relativePath: dto.relative_path,
        configType: dto.config_type,
        required: dto.required ?? false,
        containsSecrets: dto.contains_secrets,
        scanPolicy: dto.scan_policy,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.config_file.create',
      resourceType: 'project_config_file',
      resourceId: configFile.id,
    });

    return { success: true, data: configFile };
  }

  async updateConfigFile(
    projectCode: string,
    id: string,
    dto: UpdateConfigFileDto,
  ) {
    const project = await this.requireProject(projectCode);
    await this.requireConfigFile(project.id, id);

    const updated = await this.prisma.projectConfigFile.update({
      where: { id },
      data: {
        relativePath: dto.relative_path,
        configType: dto.config_type,
        required: dto.required,
        containsSecrets: dto.contains_secrets,
        scanPolicy: dto.scan_policy,
      },
    });

    await this.audit.record({
      projectId: project.id,
      action: 'project.config_file.update',
      resourceType: 'project_config_file',
      resourceId: updated.id,
      metadataJson: { fields: Object.keys(dto) },
    });

    return { success: true, data: updated };
  }

  private async requireProject(projectCode: string) {
    const project = await this.prisma.project.findUnique({
      where: { projectCode: this.normalizeProjectCode(projectCode) },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async requireRepository(projectId: string, repositoryId: string) {
    const repository = await this.prisma.projectRepository.findFirst({
      where: { id: repositoryId, projectId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    return repository;
  }

  private async requireTechStack(projectId: string, id: string) {
    const item = await this.prisma.projectTechStack.findFirst({
      where: { id, projectId },
    });

    if (!item) {
      throw new NotFoundException('Tech stack item not found');
    }

    return item;
  }

  private async requirePath(projectId: string, pathId: string) {
    const path = await this.prisma.projectPath.findFirst({
      where: { id: pathId, projectId },
    });

    if (!path) {
      throw new NotFoundException('Project path not found');
    }

    return path;
  }

  private async requireConfigFile(projectId: string, id: string) {
    const configFile = await this.prisma.projectConfigFile.findFirst({
      where: { id, projectId },
    });

    if (!configFile) {
      throw new NotFoundException('Project config file not found');
    }

    return configFile;
  }

  private normalizeProjectCode(projectCode: string): string {
    const normalized = projectCode.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,62}$/.test(normalized)) {
      throw new BadRequestException(
        'project_code must be an uppercase slug with letters, numbers, underscore or dash',
      );
    }

    return normalized;
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
