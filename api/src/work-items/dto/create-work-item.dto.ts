import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkItemDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(10_000)
  original_request!: string;

  @IsString()
  @IsIn(['bugfix', 'feature', 'research', 'refactor', 'ops', 'documentation'])
  request_type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  risk_level?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  open_questions?: string[];

  @IsOptional()
  @IsString()
  requested_by?: string;
}
