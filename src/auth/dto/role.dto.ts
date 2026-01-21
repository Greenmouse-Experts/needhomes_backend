import { IsEnum, IsInt } from 'class-validator';
import { RoleName } from 'app/common';

export class AssignRoleDto {
  @IsInt()
  userId: number;

  @IsEnum(RoleName)
  roleName: RoleName;
}

export class RemoveRoleDto {
  @IsInt()
  userId: number;

  @IsEnum(RoleName)
  roleName: RoleName;
}
