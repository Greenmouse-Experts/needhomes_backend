import { IsEnum, IsInt, IsString } from 'class-validator';
import { RoleName } from 'app/common';

export class AssignRoleDto {
  @IsString()
  userId: string;

  @IsEnum(RoleName)
  roleName: RoleName;
}

export class RemoveRoleDto {
  @IsString()
  userId: string;

  @IsEnum(RoleName)
  roleName: RoleName;
}
