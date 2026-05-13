import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TechnologyCatalogController } from './technology-catalog.controller';
import { TechnologyCatalogService } from './technology-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [TechnologyCatalogController],
  providers: [TechnologyCatalogService],
  exports: [TechnologyCatalogService],
})
export class TechnologyCatalogModule {}
