import { IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  deviceType?: string; // 'mobile' | 'web' | 'tablet'

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  browser?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}
