import { Module } from '@nestjs/common';
import { ArtifactValidatorService } from './artifact-validator.service';

@Module({
  providers: [ArtifactValidatorService],
  exports: [ArtifactValidatorService],
})
export class ArtifactsModule {}
