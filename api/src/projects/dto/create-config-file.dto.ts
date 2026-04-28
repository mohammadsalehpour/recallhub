import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConfigFileDto {
  @IsUUID()
  repository_id!: string;

  @IsString()
  @IsNotEmpty()
  relative_path!: string;

  @IsString()
  @IsNotEmpty()
  config_type!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsIn(['true', 'false', 'unknown'])
  contains_secrets!: string;

  @IsIn(['metadata_only', 'parse_safe', 'exclude'])
  scan_policy!: string;
}
