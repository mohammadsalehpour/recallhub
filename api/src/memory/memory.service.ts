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
