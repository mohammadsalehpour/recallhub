import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateTechStackDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsIn(['declared', 'detected', 'imported'])
  source?: 'declared' | 'detected' | 'imported';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsIn(['active', 'suggested', 'rejected', 'deprecated'])
  status?: 'active' | 'suggested' | 'rejected' | 'deprecated';

  @IsOptional()
  @IsString()
  notes?: string;
}
