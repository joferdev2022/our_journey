import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    const session = await auth.getSession();

    return (
      !!session ||
      router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      })
    );
  } catch {
    return router.createUrlTree(['/login']);
  }
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    return (await auth.getSession()) ? router.createUrlTree(['/']) : true;
  } catch {
    return true;
  }
};
