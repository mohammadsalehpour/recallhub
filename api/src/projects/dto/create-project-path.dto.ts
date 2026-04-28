import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProjectPathDto {
  @IsUUID()
  repository_id!: string;

  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsString()
  @IsNotEmpty()
  path_type!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsIn(['include', 'exclude', 'metadata_only'])
  scan_policy!: string;

  @IsString()
  @IsNotEmpty()
  ownership!: string;
}
