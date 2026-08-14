import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../shared/constants/roles';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  const mockSupabase = { from: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
    jest.clearAllMocks();
  });

  it('permite acceso sin roles requeridos', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ id: 'user-1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('deniega si el usuario no tiene rol staff', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: UserRole.CUSTOMER, is_active: true },
          }),
        }),
      }),
    });

    const context = createMockContext({ id: 'user-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('permite acceso a staff con rol válido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: UserRole.ADMIN, is_active: true },
          }),
        }),
      }),
    });

    const context = createMockContext({ id: 'user-1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

function createMockContext(user: { id: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, profile: undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}
