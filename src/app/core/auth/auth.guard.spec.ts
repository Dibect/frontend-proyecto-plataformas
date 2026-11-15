import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard, roleGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard, roleGuard y guestGuard', () => {
  let router: Router;
  const mockState = {} as RouterStateSnapshot;

  const crearRouteConRoles = (roles: string[]): ActivatedRouteSnapshot =>
    ({
      data: { roles },
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const inicializarContexto = () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    TestBed.inject(AuthService);
  };

  describe('authGuard', () => {
    it('debe permitir el acceso (true) cuando hay una sesión vigente', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 1, correo: 'a@b.cl', nombreCompleto: 'Ana', rol: 'Cliente' })
      );

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, mockState)
      );
      expect(resultado).toBe(true);
    });

    it('debe redirigir a /login cuando la sesión está vencida o no existe', () => {
      localStorage.setItem('dumbo_token', 'token-vencido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() - 10_000).toISOString());

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/login');
    });
  });

  describe('roleGuard', () => {
    it('debe permitir el acceso cuando el usuario tiene el rol esperado', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({
          id: 1,
          correo: 'admin@dumbo.cl',
          nombreCompleto: 'Admin',
          rol: 'Administrador',
        })
      );

      inicializarContexto();

      const route = crearRouteConRoles(['Administrador']);
      const resultado = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(resultado).toBe(true);
    });

    it('debe redirigir al ROLE_HOME del usuario si tiene otro rol válido', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 2, correo: 'cli@dumbo.cl', nombreCompleto: 'Cli', rol: 'Cliente' })
      );

      inicializarContexto();

      const route = crearRouteConRoles(['Administrador']);
      const resultado = TestBed.runInInjectionContext(() =>
        roleGuard(route, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/cliente');
    });

    it('debe redirigir a /login si no hay sesión vigente', () => {
      inicializarContexto();

      const route = crearRouteConRoles(['Cliente']);
      const resultado = TestBed.runInInjectionContext(() =>
        roleGuard(route, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/login');
    });
  });

  describe('guestGuard (T4)', () => {
    it('debe permitir el acceso (true) cuando no hay sesión activa', () => {
      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, mockState)
      );
      expect(resultado).toBe(true);
    });

    it('debe permitir el acceso (true) si el token guardado ya venció', () => {
      localStorage.setItem('dumbo_token', 'token-vencido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() - 10_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 1, correo: 'cli@dumbo.cl', nombreCompleto: 'Cli', rol: 'Cliente' })
      );

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, mockState)
      );
      expect(resultado).toBe(true);
    });

    it('debe redirigir a /admin si hay sesión vigente de Administrador', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({
          id: 1,
          correo: 'admin@dumbo.cl',
          nombreCompleto: 'Admin',
          rol: 'Administrador',
        })
      );

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/admin');
    });

    it('debe redirigir a /trabajador si hay sesión vigente de Trabajador', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({
          id: 2,
          correo: 'trab@dumbo.cl',
          nombreCompleto: 'Trab',
          rol: 'Trabajador',
        })
      );

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/trabajador');
    });

    it('debe redirigir a /cliente si hay sesión vigente de Cliente', () => {
      localStorage.setItem('dumbo_token', 'token-valido');
      localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 3, correo: 'cli@dumbo.cl', nombreCompleto: 'Cli', rol: 'Cliente' })
      );

      inicializarContexto();

      const resultado = TestBed.runInInjectionContext(() =>
        guestGuard({} as ActivatedRouteSnapshot, mockState)
      ) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/cliente');
    });
  });
});