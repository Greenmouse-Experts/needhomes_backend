import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { PartnerType } from '@prisma/client';

export class RegisterPartnerDto {
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

    @IsEnum(PartnerType)
  partnerType: PartnerType
}

export class LoginPartnerDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class VerifyPartnerEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;
}
