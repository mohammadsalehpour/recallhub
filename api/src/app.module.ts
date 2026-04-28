import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { validateEnv } from './config/env.validation';
import { N8nModule } from './integrations/n8n/n8n.module';
import { MemoryModule } from './memory/memory.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { RepositoryModule } from './repository/repository.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { StabilizationModule } from './stabilization/stabilization.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuditModule,
    RepositoryModule,
    ProjectsModule,
    MemoryModule,
    N8nModule,
    WorkflowsModule,
    WorkItemsModule,
    StabilizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
