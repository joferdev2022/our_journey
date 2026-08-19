import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const getSession = vi.fn();

  beforeEach(() => {
    getSession.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { getSession },
        },
      ],
    });
  });

  it('allows an authenticated session', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/trips' } as RouterStateSnapshot,
        ) as Promise<boolean | UrlTree>,
    );

    expect(result).toBe(true);
  });

  it('redirects guests to login and preserves the requested path', async () => {
    getSession.mockResolvedValue(null);
    const router = TestBed.inject(Router);

    const result = await TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/trips' } as RouterStateSnapshot,
        ) as Promise<boolean | UrlTree>,
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Ftrips');
  });
});
