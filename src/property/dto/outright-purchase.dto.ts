import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { PaymentOption } from '@prisma/client';
import { BasePropertyDto } from './base-property.dto';

export class OutrightPurchaseDto extends BasePropertyDto {
  @IsOptional()
  @IsEnum(PaymentOption)
  paymentOption?: PaymentOption;

  @IsOptional()
  @IsInt()
  installmentDuration?: number; // months
}
