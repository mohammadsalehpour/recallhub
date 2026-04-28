import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class RunWorkflowDto {
  @IsOptional()
  @IsString()
  idempotency_key?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  work_item_id?: string;

  @IsOptional()
  @IsUUID()
  triggered_by?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
