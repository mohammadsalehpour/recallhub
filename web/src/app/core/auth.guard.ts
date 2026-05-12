import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from './app-state.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (appState.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const adminGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (appState.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/project-setup']);
};
