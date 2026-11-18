import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { API_BASE, API_URL } from '../api.config';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  const configurarSesionVigente = () => {
    localStorage.setItem('dumbo_token', 'mi-token-secreto');
    localStorage.setItem('dumbo_exp', new Date(Date.now() + 60_000).toISOString());
    localStorage.setItem(
      'dumbo_user',
      JSON.stringify({ id: 1, correo: 'admin@dumbo.cl', nombreCompleto: 'Admin', rol: 'Administrador' })
    );
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const inicializar = () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  };

  it('debe adjuntar Authorization Bearer solo a URLs que comienzan con API_BASE cuando la sesión está vigente', () => {
    configurarSesionVigente();
    inicializar();

    http.get(`${API_BASE}/trabajadores`).subscribe();
    const reqInterna = httpMock.expectOne(`${API_BASE}/trabajadores`);
    expect(reqInterna.request.headers.get('Authorization')).toBe('Bearer mi-token-secreto');
    reqInterna.flush([]);

    http.get('https://api.externa.cl/datos').subscribe();
    const reqExterna = httpMock.expectOne('https://api.externa.cl/datos');
    expect(reqExterna.request.headers.has('Authorization')).toBe(false);
    reqExterna.flush({});
  });

  it('debe cerrar sesión con motivo expirada cuando un endpoint protegido devuelve 401', () => {
    configurarSesionVigente();
    inicializar();
    const navigateSpy = vi.spyOn(router, 'navigate');

    http.get(`${API_BASE}/trabajadores`).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${API_BASE}/trabajadores`);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { sesion: 'expirada' },
    });
  });

  it('NO debe cerrar sesión cuando /login devuelve 401', () => {
    inicializar();
    const logoutSpy = vi.spyOn(authService, 'logout');

    http.post(`${API_URL}/login`, { correo: 'a@b.cl', contrasena: 'mal' }).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(`${API_URL}/login`);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('NO debe cerrar sesión cuando un endpoint protegido devuelve 403 (se deja pasar al componente)', () => {
    configurarSesionVigente();
    inicializar();
    const logoutSpy = vi.spyOn(authService, 'logout');

    let statusRecibido = 0;
    http.get(`${API_BASE}/trabajadores`).subscribe({
      error: (err) => {
        statusRecibido = err.status;
      },
    });

    const req = httpMock.expectOne(`${API_BASE}/trabajadores`);
    req.flush(null, { status: 403, statusText: 'Forbidden' });

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(authService.isAuthenticated()).toBe(true);
    expect(statusRecibido).toBe(403);
  });
});