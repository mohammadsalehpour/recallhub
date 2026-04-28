import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class HumanApprovalDto {
  @IsString()
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;

  @IsOptional()
  @IsUUID()
  actor_id?: string;
}
