import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nCallbackController } from './n8n-callback.controller';
import { N8nCallbackService } from './n8n-callback.service';
import { N8nSignatureGuard } from './n8n-signature.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [N8nCallbackController],
  providers: [N8nCallbackService, N8nSignatureGuard],
})
export class N8nModule {}
