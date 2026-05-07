import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StabilizationController } from './stabilization.controller';
import { StabilizationService } from './stabilization.service';

@Module({
  imports: [PrismaModule],
  controllers: [StabilizationController],
  providers: [StabilizationService],
})
export class StabilizationModule {}
