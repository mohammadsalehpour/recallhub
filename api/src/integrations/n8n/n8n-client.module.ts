import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { N8nClientService } from './n8n-client.service';

@Module({
  imports: [ConfigModule],
  providers: [N8nClientService],
  exports: [N8nClientService],
})
export class N8nClientModule {}
