import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password_confirmation!: string;
}
