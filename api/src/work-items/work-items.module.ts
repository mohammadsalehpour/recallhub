import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { N8nClientModule } from '../integrations/n8n/n8n-client.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  imports: [PrismaModule, AuditModule, N8nClientModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
