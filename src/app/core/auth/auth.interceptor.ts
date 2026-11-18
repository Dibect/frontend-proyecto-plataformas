import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE, API_URL } from '../api.config';

const ENDPOINTS_AUTH_PUBLICOS = [
  `${API_URL}/login`,
  `${API_URL}/register`,
  `${API_URL}/recuperar-contrasena`,
  `${API_URL}/restablecer-contrasena`,
];

function esEndpointPublicoAuth(url: string): boolean {
  return ENDPOINTS_AUTH_PUBLICOS.some((endpoint) => url.startsWith(endpoint));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const esApiPropia = req.url.startsWith(API_BASE);
  const token = authService.token();
  const sesionVigente = authService.isAuthenticated();

  let ibaAutenticado = false;

  if (esApiPropia && token && sesionVigente) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    ibaAutenticado = true;
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && ibaAutenticado && !esEndpointPublicoAuth(req.url)) {
        authService.logout('expirada');
      }
      return throwError(() => error);
    })
  );
};