import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class N8nCallbackArtifactDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsObject()
  contentJson?: Record<string, unknown>;
}

export class N8nCallbackDto {
  @IsUUID()
  runId!: string;

  @IsString()
  workflowCode!: string;

  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsOptional()
  @IsString()
  n8nExecutionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nCallbackArtifactDto)
  artifact?: N8nCallbackArtifactDto;

  @IsOptional()
  @IsObject()
  error?: Record<string, unknown>;
}
