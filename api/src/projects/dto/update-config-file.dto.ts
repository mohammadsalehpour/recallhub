import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateConfigFileDto {
  @IsOptional()
  @IsString()
  relative_path?: string;

  @IsOptional()
  @IsString()
  config_type?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsIn(['true', 'false', 'unknown'])
  contains_secrets?: string;

  @IsOptional()
  @IsIn(['metadata_only', 'parse_safe', 'exclude'])
  scan_policy?: string;
}
