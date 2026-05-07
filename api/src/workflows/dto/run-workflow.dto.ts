import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  workItemId?: string;

  @IsOptional()
  @IsUUID()
  triggeredBy?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
