import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class HumanApprovalDto {
  @IsString()
  @IsIn(['approve', 'approve_with_waiver', 'reject'])
  decision!: 'approve' | 'approve_with_waiver' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;

  @IsOptional()
  @IsUUID()
  actor_id?: string;

  @IsOptional()
  @IsUUID()
  artifact_id?: string;
}
