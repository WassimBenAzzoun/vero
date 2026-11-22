import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const createContext = (user?: { role: string }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should allow an authorized role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(guard.canActivate(createContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('should reject an unauthorized role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext({ role: 'VIEWER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('should allow any authenticated user when no roles are specified', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: 'VIEWER' }))).toBe(true);
  });
});
