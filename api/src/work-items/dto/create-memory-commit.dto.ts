import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMemoryCommitDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  what_changed!: string;

  @IsString()
  why_changed!: string;

  @IsString()
  how_changed!: string;

  @IsOptional()
  @IsArray()
  files_touched?: string[];

  @IsOptional()
  @IsArray()
  modules_touched?: string[];

  @IsOptional()
  @IsArray()
  commands_run?: string[];

  @IsOptional()
  @IsObject()
  validation_result?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  risks_remaining?: string[];

  @IsOptional()
  @IsString()
  created_by?: string;
}
