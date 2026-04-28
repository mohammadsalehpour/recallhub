import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  @IsNotEmpty()
  repo_name!: string;

  @IsIn(['local_path', 'git_url', 'docker_volume', 'network_share'])
  locator_type!: string;

  @IsString()
  @IsNotEmpty()
  repo_root!: string;

  @IsOptional()
  @IsString()
  default_branch?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
