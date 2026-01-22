import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    {
      message: 'Please provide a valid phone number',
    },
  )
  phone: string;

  @IsOptional()
  @IsString()
  referral_source?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  
}

export class ForgotPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class VerifyResetOtpDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code' })
  otp: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;
}
