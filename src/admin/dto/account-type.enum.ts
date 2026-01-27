import { IsEnum, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export enum AccountTypeEnum {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
  PARTNER = 'PARTNER',
}

export class ListUsersDto {
  @IsOptional()
  @IsEnum(AccountTypeEnum)
  accountType?: AccountTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}