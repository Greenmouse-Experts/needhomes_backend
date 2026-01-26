import { IsString } from 'class-validator';

export class ResolveAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  bankCode: string;
}
