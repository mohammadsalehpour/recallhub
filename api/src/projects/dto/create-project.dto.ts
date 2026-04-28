import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class PrimaryFrameworkDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;
}

export class CreateTechStackItemDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsIn(['declared', 'detected', 'imported'])
  source!: 'declared' | 'detected' | 'imported';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  project_code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  business_domain?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PrimaryFrameworkDto)
  primary_framework!: PrimaryFrameworkDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTechStackItemDto)
  tech_stack!: CreateTechStackItemDto[];
}
