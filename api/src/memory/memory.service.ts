import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listModules(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectModule.findMany({
      where: { projectId: project.id },
      orderBy: { modulePath: 'asc' },
    });
  }

  async listFiles(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.projectFile.findMany({
      where: { projectId: project.id },
      orderBy: { filePath: 'asc' },
      take: 500,
    });
  }

  async listMemoryChunks(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.memoryChunk.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async listMemoryEvents(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.memoryEvent.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listMemoryCommits(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.memoryCommit.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listSyncRuns(projectCode: string) {
    const project = await this.requireProject(projectCode);
    return this.prisma.workflowRun.findMany({
      where: {
        projectId: project.id,
        workflowDefinition: { code: 'project.scan' },
      },
      include: { workflowDefinition: true, events: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async searchMemory(projectCode: string, query?: string) {
    const project = await this.requireProject(projectCode);
    const trimmed = query?.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    const [chunks, modules, files, commits] = await Promise.all([
      this.prisma.memoryChunk.findMany({
        where: {
          projectId: project.id,
          OR: [
            { content: { contains: trimmed, mode: 'insensitive' } },
            { chunkKey: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.projectModule.findMany({
        where: {
          projectId: project.id,
          OR: [
            { moduleName: { contains: trimmed, mode: 'insensitive' } },
            { modulePath: { contains: trimmed, mode: 'insensitive' } },
            { summary: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.projectFile.findMany({
        where: {
          projectId: project.id,
          OR: [
            { filePath: { contains: trimmed, mode: 'insensitive' } },
            { fileName: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.memoryCommit.findMany({
        where: {
          projectId: project.id,
          OR: [
            { title: { contains: trimmed, mode: 'insensitive' } },
            { whatChanged: { contains: trimmed, mode: 'insensitive' } },
            { whyChanged: { contains: trimmed, mode: 'insensitive' } },
            { howChanged: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      success: true,
      data: { query: trimmed, chunks, modules, files, commits },
    };
  }

  private async requireProject(projectCode: string) {
    const project = await this.prisma.project.findUnique({
      where: { projectCode: projectCode.trim().toUpperCase() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
