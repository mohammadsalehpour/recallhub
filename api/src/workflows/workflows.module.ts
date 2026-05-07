import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { N8nClientModule } from '../integrations/n8n/n8n-client.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [PrismaModule, AuditModule, N8nClientModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
