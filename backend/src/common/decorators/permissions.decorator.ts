import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../../shared/constants/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
