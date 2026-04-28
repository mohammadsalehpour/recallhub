import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RepositoryModule } from '../repository/repository.module';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { ProjectSyncService } from './project-sync.service';

@Module({
  imports: [PrismaModule, AuditModule, RepositoryModule],
  controllers: [MemoryController],
  providers: [MemoryService, ProjectSyncService],
})
export class MemoryModule {}
