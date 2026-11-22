import { Routes } from '@angular/router';
import { authGuard, roleGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
    canActivate: [guestGuard],
    data: { modo: 'autoregistro' },
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./recuperar-contrasena/recuperar-contrasena').then((m) => m.RecuperarContrasena),
    canActivate: [guestGuard],
  },
  {
    path: 'restablecer-contrasena',
    loadComponent: () =>
      import('./restablecer-contrasena/restablecer-contrasena').then(
        (m) => m.RestablecerContrasena
      ),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador'] },
  },
  {
    path: 'admin/trabajadores',
    loadComponent: () =>
      import('./admin/trabajadores/trabajadores-lista').then((m) => m.TrabajadoresLista),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrador'] },
  },
  {
    path: 'trabajador',
    loadComponent: () => import('./trabajador/trabajador').then((m) => m.Trabajador),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Trabajador'] },
  },
  {
    path: 'trabajador/inventario',
    loadComponent: () =>
      import('./trabajador/inventario/inventario').then((m) => m.Inventario),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Trabajador'] },
  },
  {
    path: 'trabajador/registrar-cliente',
    loadComponent: () => import('./register/register').then((m) => m.Register),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Trabajador'], modo: 'trabajador' },
  },
  {
    path: 'cliente',
    loadComponent: () => import('./cliente/cliente').then((m) => m.Cliente),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Cliente'] },
  },
  { path: '**', redirectTo: '/login' },
];
