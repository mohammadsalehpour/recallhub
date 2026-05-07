import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProjectPathDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  path_type?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsIn(['include', 'exclude', 'metadata_only'])
  scan_policy?: string;

  @IsOptional()
  @IsString()
  ownership?: string;
}
