import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ROLE_HOME } from '../../app.routes';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as string[];
  const userRole = authService.role();

  if (userRole && expectedRoles.includes(userRole)) return true;
  return userRole && ROLE_HOME[userRole] ? router.createUrlTree([ROLE_HOME[userRole]]) : router.createUrlTree(['/login']);
};