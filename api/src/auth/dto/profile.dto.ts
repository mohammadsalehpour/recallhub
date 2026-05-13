import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  avatar_url?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  new_password!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @MaxLength(160)
  identifier!: string;
}
