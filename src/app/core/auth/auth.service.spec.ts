import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthResponse } from './auth.service';
import { API_URL } from '../api.config';

function crearJwtConExp(expSegundos: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '1', exp: expSegundos }));
  return `${header}.${payload}.firma`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    service.logout();
    httpMock.verify();
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('Sesión, expiración y auto-logout', () => {
    it('debe guardar token, usuario y fechaExpiracion al hacer login y marcar isAuthenticated = true', () => {
      const futuroIso = new Date(Date.now() + 60_000).toISOString();
      const mockResponse: AuthResponse = {
        token: 'jwt-token-valido',
        fechaExpiracion: futuroIso,
        usuario: {
          id: 1,
          correo: 'cliente@dumbo.cl',
          nombreCompleto: 'Cliente Prueba',
          rol: 'Cliente',
        },
      };

      service.login('cliente@dumbo.cl', '12345678K').subscribe();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(mockResponse);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.role()).toBe('Cliente');
      expect(localStorage.getItem('dumbo_token')).toBe('jwt-token-valido');
      expect(localStorage.getItem('dumbo_exp')).toBe(futuroIso);
    });

    it('debe extraer exp desde el JWT si dumbo_exp no está en localStorage', () => {
      const expSegundos = Math.floor((Date.now() + 120_000) / 1000);
      const jwt = crearJwtConExp(expSegundos);

      localStorage.setItem('dumbo_token', jwt);
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 2, correo: 'a@b.cl', nombreCompleto: 'Ana', rol: 'Trabajador' })
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const nuevoRouter = TestBed.inject(Router);
      vi.spyOn(nuevoRouter, 'navigate').mockResolvedValue(true);
      const nuevoService = TestBed.inject(AuthService);

      expect(nuevoService.isAuthenticated()).toBe(true);
      expect(nuevoService.role()).toBe('Trabajador');
    });

    it('debe limpiar la sesión al iniciar el servicio si el token guardado ya venció', () => {
      const pasadoIso = new Date(Date.now() - 5_000).toISOString();
      localStorage.setItem('dumbo_token', 'token-vencido');
      localStorage.setItem('dumbo_exp', pasadoIso);
      localStorage.setItem(
        'dumbo_user',
        JSON.stringify({ id: 1, correo: 'a@b.cl', nombreCompleto: 'Ana', rol: 'Cliente' })
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const nuevoRouter = TestBed.inject(Router);
      vi.spyOn(nuevoRouter, 'navigate').mockResolvedValue(true);
      const nuevoService = TestBed.inject(AuthService);

      expect(nuevoService.isAuthenticated()).toBe(false);
      expect(nuevoService.token()).toBeNull();
      expect(localStorage.getItem('dumbo_token')).toBeNull();
      expect(localStorage.getItem('dumbo_exp')).toBeNull();
    });

    it('debe limpiar storage y navegar a /login sin queryParams en logout manual', () => {
      const futuroIso = new Date(Date.now() + 60_000).toISOString();

      service.login('cliente@dumbo.cl', '12345678K').subscribe();
      httpMock.expectOne(`${API_URL}/login`).flush({
        token: 'jwt-valido',
        fechaExpiracion: futuroIso,
        usuario: { id: 1, correo: 'cliente@dumbo.cl', nombreCompleto: 'Juan', rol: 'Cliente' },
      });

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('dumbo_token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('debe ejecutar auto-logout al vencer el tiempo y redirigir a /login?sesion=expirada', () => {
      vi.useFakeTimers();
      const expEn30Segundos = new Date(Date.now() + 30_000).toISOString();

      service.login('cliente@dumbo.cl', '12345678K').subscribe();
      httpMock.expectOne(`${API_URL}/login`).flush({
        token: 'jwt-temporal',
        fechaExpiracion: expEn30Segundos,
        usuario: { id: 1, correo: 'cliente@dumbo.cl', nombreCompleto: 'Juan', rol: 'Cliente' },
      });

      expect(service.isAuthenticated()).toBe(true);

      vi.advanceTimersByTime(20_000);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.token()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { sesion: 'expirada' },
      });
    });
  });

  describe('Mapeo de errores en login', () => {
    it('debe priorizar el mensaje exacto del ERS para 401 y 403 sobre err.error.message', () => {
      let msg401 = '';
      service.login('a@b.cl', 'mal').subscribe({ error: (e) => (msg401 = e) });
      httpMock
        .expectOne(`${API_URL}/login`)
        .flush({ message: 'Otro texto' }, { status: 401, statusText: 'Unauthorized' });
      expect(msg401).toBe(
        'Las credenciales de acceso son incorrectas o el usuario no está registrado en el sistema'
      );

      let msg403 = '';
      service.login('a@b.cl', 'mal').subscribe({ error: (e) => (msg403 = e) });
      httpMock
        .expectOne(`${API_URL}/login`)
        .flush({ message: 'Otro texto' }, { status: 403, statusText: 'Forbidden' });
      expect(msg403).toBe('Usuario deshabilitado');
    });
  });

  describe('solicitarRecuperacion y restablecerContrasena (T2)', () => {
    it('debe enviar POST a /recuperar-contrasena con el correo limpio y completar con 204', () => {
      let completado = false;
      service.solicitarRecuperacion('  cliente@dumbo.cl  ').subscribe({
        next: () => {
          completado = true;
        },
      });

      const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo: 'cliente@dumbo.cl' });

      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completado).toBe(true);
    });

    it('debe tratar un 404 como éxito para no revelar si el correo existe', () => {
      let completado = false;
      service.solicitarRecuperacion('noexiste@dumbo.cl').subscribe({
        next: () => {
          completado = true;
        },
      });

      const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
      req.flush(null, { status: 404, statusText: 'Not Found' });
      expect(completado).toBe(true);
    });

    it('debe enviar POST a /restablecer-contrasena con token y nuevaContrasena', () => {
      let completado = false;
      service.restablecerContrasena('token-abc-123', 'Abcdefgh1').subscribe({
        next: () => {
          completado = true;
        },
      });

      const req = httpMock.expectOne(`${API_URL}/restablecer-contrasena`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'token-abc-123',
        nuevaContrasena: 'Abcdefgh1',
      });

      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completado).toBe(true);
    });
  });
});