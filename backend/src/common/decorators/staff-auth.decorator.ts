import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import {
  ADMIN_ROLES,
  CATALOG_ROLES,
  ORDERS_ROLES,
  REPORTS_ROLES,
  SALES_ROLES,
  STAFF_ROLES,
  UserRole,
} from '../../shared/constants/roles';

export function StaffAuth(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(SupabaseAuthGuard, RolesGuard),
    Roles(...(roles.length ? roles : STAFF_ROLES)),
    ApiBearerAuth(),
  );
}

export function AdminAuth() {
  return StaffAuth(...ADMIN_ROLES);
}

export function CatalogAuth() {
  return StaffAuth(...CATALOG_ROLES);
}

export function SalesAuth() {
  return StaffAuth(...SALES_ROLES);
}

export function OrdersAuth() {
  return StaffAuth(...ORDERS_ROLES);
}

export function ReportsAuth() {
  return StaffAuth(...REPORTS_ROLES);
}
