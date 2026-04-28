import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class StartWorkflowDto {
  @IsOptional()
  @IsUUID()
  triggered_by?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
