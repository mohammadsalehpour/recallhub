import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Dirent, existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import {
  ProjectStatus,
  RepositoryStatus,
  WorkflowExecutor,
  WorkflowRunStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryPathResolverService } from '../repository/repository-path-resolver.service';
import { SafeManifestParserService } from '../repository/safe-manifest-parser.service';
import { SecretRedactionService } from '../repository/secret-redaction.service';

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
  'dist',
  'build',
  '.mypy_cache',
  '.pytest_cache',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.py',
  '.xml',
  '.js',
  '.ts',
  '.json',
  '.yml',
  '.yaml',
  '.csv',
  '.md',
  '.rst',
  '.txt',
  '.sql',
  '.scss',
  '.css',
]);

const MAX_FILES_PER_SYNC = 20_000;
const MAX_FILE_SIZE_BYTES = 1_048_576;
const MAX_TOTAL_BYTES_PER_SYNC = 200 * 1024 * 1024;

type DiscoveredFile = {
  absolutePath: string;
  relativePath: string;
  scanPolicy: string;
  ownership: string;
  pathType: string;
  sizeBytes: number;
};

@Injectable()
export class ProjectSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pathResolver: RepositoryPathResolverService,
    private readonly manifestParser: SafeManifestParserService,
    private readonly secretRedaction: SecretRedactionService,
  ) {}

  async syncProject(projectCode: string, idempotencyKey?: string) {
    const project = await this.prisma.project.findUnique({
      where: { projectCode: projectCode.trim().toUpperCase() },
      include: {
        repositories: true,
        paths: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const repository = project.repositories.find(
      (repo) =>
        repo.status === RepositoryStatus.valid &&
        (repo.isPrimary || project.repositories.length === 1),
    );

    if (!repository) {
      throw new BadRequestException('Project has no valid repository to sync');
    }

    const includePaths = project.paths.filter(
      (path) =>
        path.repositoryId === repository.id && path.scanPolicy !== 'exclude',
    );

    if (includePaths.length === 0) {
      throw new BadRequestException(
        'Project must have at least one include or metadata_only path',
      );
    }

    const definition = await this.ensureProjectScanDefinition();
    const existing = idempotencyKey
      ? await this.prisma.workflowRun.findUnique({
          where: {
            workflowDefinitionId_idempotencyKey: {
              workflowDefinitionId: definition.id,
              idempotencyKey,
            },
          },
        })
      : null;

    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_IDEMPOTENCY_KEY',
        workflowRunId: existing.id,
      });
    }

    const inFlight = await this.prisma.workflowRun.findFirst({
      where: {
        workflowDefinitionId: definition.id,
        projectId: project.id,
        status: {
          in: [
            WorkflowRunStatus.pending,
            WorkflowRunStatus.queued,
            WorkflowRunStatus.running,
            WorkflowRunStatus.retrying,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (inFlight) {
      throw new ConflictException({
        code: 'PROJECT_SYNC_ALREADY_RUNNING',
        workflowRunId: inFlight.id,
      });
    }

    const repoRoot = this.pathResolver.resolveUserPath(repository.repoRoot);
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowDefinitionId: definition.id,
        projectId: project.id,
        status: WorkflowRunStatus.running,
        idempotencyKey,
        startedAt: new Date(),
        inputJson: {
          repositoryId: repository.id,
          repoRoot,
          includePaths: includePaths.map((path) => ({
            path: path.path,
            scanPolicy: path.scanPolicy,
            ownership: path.ownership,
          })),
        },
        events: {
          create: {
            eventType: 'project_sync.started',
            payloadJson: { projectCode: project.projectCode },
          },
        },
      },
    });

    try {
      const files = await this.discoverFiles(repoRoot, includePaths);
      const result = await this.persistScan(
        project,
        repository.id,
        run.id,
        files,
      );

      const completed = await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: WorkflowRunStatus.succeeded,
          outputJson: result,
          finishedAt: new Date(),
          events: {
            create: {
              eventType: 'project_sync.succeeded',
              payloadJson: result,
            },
          },
        },
      });

      await this.audit.record({
        projectId: project.id,
        action: 'project.sync',
        resourceType: 'workflow_run',
        resourceId: completed.id,
        metadataJson: result,
      });

      return { success: true, data: { workflowRun: completed, result } };
    } catch (error) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: WorkflowRunStatus.failed,
          errorJson: this.serializeError(error),
          finishedAt: new Date(),
          events: {
            create: {
              eventType: 'project_sync.failed',
              payloadJson: this.serializeError(error),
            },
          },
        },
      });

      throw error;
    }
  }

  private async discoverFiles(
    repoRoot: string,
    paths: Array<{
      path: string;
      scanPolicy: string;
      ownership: string;
      pathType: string;
    }>,
  ): Promise<DiscoveredFile[]> {
    const files: DiscoveredFile[] = [];
    let totalBytes = 0;

    for (const projectPath of paths) {
      const absoluteBase = resolve(repoRoot, projectPath.path);
      this.assertInsideRoot(repoRoot, absoluteBase);

      if (!existsSync(absoluteBase)) {
        continue;
      }

      const entries = await this.walkDirectory(absoluteBase);
      for (const entry of entries) {
        if (files.length >= MAX_FILES_PER_SYNC) {
          throw new BadRequestException('Sync exceeded MAX_FILES_PER_SYNC');
        }

        const fileStat = await stat(entry);
        if (!fileStat.isFile()) {
          continue;
        }

        if (fileStat.size > MAX_FILE_SIZE_BYTES) {
          continue;
        }

        totalBytes += fileStat.size;
        if (totalBytes > MAX_TOTAL_BYTES_PER_SYNC) {
          throw new BadRequestException(
            'Sync exceeded MAX_TOTAL_BYTES_PER_SYNC',
          );
        }

        const relativePath = relative(repoRoot, entry);
        if (!this.isAllowedFile(relativePath)) {
          continue;
        }

        files.push({
          absolutePath: entry,
          relativePath,
          scanPolicy: projectPath.scanPolicy,
          ownership: projectPath.ownership,
          pathType: projectPath.pathType,
          sizeBytes: fileStat.size,
        });
      }
    }

    return files;
  }

  private async walkDirectory(directory: string): Promise<string[]> {
    const discovered: string[] = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        discovered.push(...(await this.walkDirectory(absolutePath)));
      } else if (this.isFile(entry)) {
        discovered.push(absolutePath);
      }
    }

    return discovered;
  }

  private isFile(entry: Dirent): boolean {
    return entry.isFile();
  }

  private async persistScan(
    project: { id: string; projectCode: string },
    repositoryId: string,
    workflowRunId: string,
    files: DiscoveredFile[],
  ) {
    const moduleByPath = new Map<string, string>();
    let moduleCount = 0;
    let fileCount = 0;
    let chunkCount = 0;
    const warnings: string[] = [];

    for (const file of files) {
      if (basename(file.relativePath) === '__manifest__.py') {
        const modulePath = file.relativePath.split(sep).slice(0, -1).join('/');
        const manifestContent = await readFile(file.absolutePath, 'utf8');
        const parsed = this.manifestParser.parseOdooManifest(manifestContent);
        if (parsed.warning) {
          warnings.push(`${file.relativePath}: ${parsed.warning}`);
        }

        const module = await this.prisma.projectModule.upsert({
          where: {
            projectId_repositoryId_modulePath: {
              projectId: project.id,
              repositoryId,
              modulePath,
            },
          },
          update: {
            manifestJson: parsed.manifest as Prisma.InputJsonValue | undefined,
            dependsJson: parsed.manifest?.depends ?? [],
            lastSyncRunId: workflowRunId,
            isActive: true,
          },
          create: {
            projectId: project.id,
            repositoryId,
            moduleName: basename(modulePath),
            modulePath,
            moduleType: 'odoo_addon',
            ownership: file.ownership,
            manifestJson: parsed.manifest as Prisma.InputJsonValue | undefined,
            dependsJson: parsed.manifest?.depends ?? [],
            sourceStatus: 'discovered',
            isActive: true,
            lastSyncRunId: workflowRunId,
          },
        });

        moduleByPath.set(modulePath, module.id);
        moduleCount += 1;
      }
    }

    for (const file of files) {
      const modulePath = this.findOwningModulePath(
        file.relativePath,
        moduleByPath,
      );
      const contentHash = await this.hashFile(file.absolutePath);
      const projectFile = await this.prisma.projectFile.upsert({
        where: {
          projectId_repositoryId_filePath: {
            projectId: project.id,
            repositoryId,
            filePath: file.relativePath,
          },
        },
        update: {
          moduleId: modulePath ? moduleByPath.get(modulePath) : undefined,
          fileSizeBytes: file.sizeBytes,
          contentHash,
          scanPolicy: file.scanPolicy,
          containsSecrets: this.secretRedaction.looksSensitivePath(
            file.relativePath,
          ),
          isActive: true,
          lastSyncRunId: workflowRunId,
          metadataJson: { pathType: file.pathType, ownership: file.ownership },
        },
        create: {
          projectId: project.id,
          repositoryId,
          moduleId: modulePath ? moduleByPath.get(modulePath) : undefined,
          filePath: file.relativePath,
          fileName: basename(file.relativePath),
          fileExt: extname(file.relativePath),
          fileKind: this.inferFileKind(file.relativePath),
          fileSizeBytes: file.sizeBytes,
          contentHash,
          scanPolicy: file.scanPolicy,
          containsSecrets: this.secretRedaction.looksSensitivePath(
            file.relativePath,
          ),
          isActive: true,
          lastSyncRunId: workflowRunId,
          metadataJson: { pathType: file.pathType, ownership: file.ownership },
        },
      });

      fileCount += 1;

      if (
        file.scanPolicy === 'include' &&
        !this.secretRedaction.looksSensitivePath(file.relativePath)
      ) {
        const rawContent = await readFile(file.absolutePath, 'utf8');
        const content = this.secretRedaction
          .redact(rawContent)
          .slice(0, 16_000);
        const chunkKey = `${project.projectCode}:${file.relativePath}:${contentHash}`;

        await this.prisma.memoryChunk.upsert({
          where: { chunkKey },
          update: {
            content,
            metadataJson: { filePath: file.relativePath, workflowRunId },
          },
          create: {
            projectId: project.id,
            sourceType: 'file',
            sourceId: projectFile.id,
            chunkKey,
            chunkType: 'file_content',
            content,
            sensitivity: 'internal',
            metadataJson: { filePath: file.relativePath, workflowRunId },
          },
        });
        chunkCount += 1;
      }
    }

    await this.prisma.memoryEvent.create({
      data: {
        projectId: project.id,
        eventType: 'project.synced',
        summary: `Project sync indexed ${moduleCount} modules and ${fileCount} files.`,
        afterJson: { moduleCount, fileCount, chunkCount, warnings },
      },
    });

    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.indexed,
      },
    });

    return { moduleCount, fileCount, chunkCount, warnings };
  }

  private async ensureProjectScanDefinition() {
    return this.prisma.workflowDefinition.upsert({
      where: { code: 'project.scan' },
      update: {
        name: 'Project Scan Artifact',
        executor: WorkflowExecutor.internal_worker,
        active: true,
      },
      create: {
        code: 'project.scan',
        name: 'Project Scan Artifact',
        executor: WorkflowExecutor.internal_worker,
        active: true,
      },
    });
  }

  private isAllowedFile(relativePath: string): boolean {
    return ALLOWED_EXTENSIONS.has(extname(relativePath).toLowerCase());
  }

  private findOwningModulePath(
    relativePath: string,
    moduleByPath: Map<string, string>,
  ): string | undefined {
    return Array.from(moduleByPath.keys())
      .sort((a, b) => b.length - a.length)
      .find(
        (modulePath) =>
          relativePath === modulePath ||
          relativePath.startsWith(`${modulePath}/`),
      );
  }

  private async hashFile(path: string): Promise<string> {
    const content = await readFile(path);
    return createHash('sha256').update(content).digest('hex');
  }

  private inferFileKind(relativePath: string): string {
    const ext = extname(relativePath).toLowerCase().replace('.', '');
    return ext || 'unknown';
  }

  private assertInsideRoot(repoRoot: string, target: string) {
    const root = repoRoot.endsWith(sep) ? repoRoot : `${repoRoot}${sep}`;
    if (target !== repoRoot && !target.startsWith(root)) {
      throw new BadRequestException('Path escapes repository root');
    }
  }

  private serializeError(error: unknown): Prisma.InputJsonValue {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }

    return { message: 'Unknown sync error' };
  }
}
