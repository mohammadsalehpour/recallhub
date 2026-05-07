import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class StartWorkflowDto {
  @IsOptional()
  @IsUUID()
  triggeredBy?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
