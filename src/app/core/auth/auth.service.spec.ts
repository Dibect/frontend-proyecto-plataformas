import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_URL } from '../api.config';

describe('AuthService (T2 · Recuperar y restablecer contraseña)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('solicitarRecuperacion', () => {
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

    it('debe propagar error cuando falla la red (status 0)', () => {
      let errorRecibido: string | null = null;
      service.solicitarRecuperacion('cliente@dumbo.cl').subscribe({
        error: (err) => {
          errorRecibido = err;
        },
      });

      const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
      req.error(new ProgressEvent('error'));
      expect(errorRecibido).toContain('No hay conexión con el servidor');
    });
  });

  describe('restablecerContrasena', () => {
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

    it('debe propagar mensaje de error en 400 (token inválido o vencido)', () => {
      let errorRecibido: string | null = null;
      service.restablecerContrasena('token-vencido', 'Abcdefgh1').subscribe({
        error: (err) => {
          errorRecibido = err;
        },
      });

      const req = httpMock.expectOne(`${API_URL}/restablecer-contrasena`);
      req.flush(null, { status: 400, statusText: 'Bad Request' });
      expect(errorRecibido).toContain('inválido o ha expirado');
    });
  });
});