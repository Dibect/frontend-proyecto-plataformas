import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';

export const ROLE_HOME: Record<string, string> = {
  'Administrador': '/admin',
  'Trabajador': '/trabajador'
};

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./login/login').then(m => m.Login) },
  { 
    path: 'admin', 
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador'] }
  },
  { 
    path: 'trabajador', 
    loadComponent: () => import('./trabajador/trabajador').then(m => m.Trabajador),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Trabajador'] }
  },
  { path: '**', redirectTo: '/login' }
];