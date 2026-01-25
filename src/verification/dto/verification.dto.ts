import { isEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationType } from '@prisma/client';

export class userVerificationDto {
  @IsNotEmpty()
  @IsString()
  idType?: string;

  @IsNotEmpty()
  @IsString()
  frontPage: string;

  @IsNotEmpty()
  @IsString()
  backPage: string;

  @IsNotEmpty()
  @IsString()
  utilityBill: string;

  @IsNotEmpty()
  @IsString()
  address: string;
}


export class partnerVerificationDto {
  @IsNotEmpty()
  @IsString()
  idType?: string;

  @IsNotEmpty()
  @IsString()
  frontPage: string;

  @IsNotEmpty()
  @IsString()
  backPage: string;

  @IsNotEmpty()
  @IsString()
  utilityBill: string;

  @IsNotEmpty()
  @IsString()
  address: string;
}

export class companyVerificationDto{
    @IsNotEmpty()
    @IsString()
    companyName: string;

    @IsNotEmpty()
    @IsString()
    rcNumber: string;

    @IsNotEmpty()
    @IsString()
    cacDocument: string;

    @IsNotEmpty()
    @IsString()
    authorizedId: string;
}


