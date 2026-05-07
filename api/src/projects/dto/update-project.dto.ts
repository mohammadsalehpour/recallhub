import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdatePrimaryFrameworkDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  business_domain?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdatePrimaryFrameworkDto)
  primary_framework?: UpdatePrimaryFrameworkDto;
}
