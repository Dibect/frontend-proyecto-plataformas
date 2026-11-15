import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, map } from 'rxjs/operators';
import { throwError, of, Observable } from 'rxjs';
import { API_URL } from '../api.config';

export interface Usuario {
  id: number;
  correo: string;
  nombreCompleto: string;
  rol: string;
}

export interface AuthResponse {
  token: string;
  fechaExpiracion: string;
  usuario: Usuario;
}

export interface RegistroRequest {
  rut: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
}

export type MotivoLogout = 'manual' | 'expirada';

const MARGEN_EXPIRACION_MS = 10_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function extraerExpiracionDeJwt(token: string): string | null {
  try {
    const partes = token.split('.');
    if (partes.length < 2) return null;
    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const exp = payload['exp'];
    if (typeof exp === 'number') {
      return new Date(exp * 1000).toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = signal<string | null>(localStorage.getItem('dumbo_token'));
  readonly user = signal<Usuario | null>(this.loadUserFromStorage());
  readonly fechaExpiracion = signal<string | null>(this.loadExpirationFromStorage());

  readonly isAuthenticated = computed(() => {
    const tok = this.token();
    const exp = this.fechaExpiracion();
    if (!tok) return false;
    return !this.estaVencida(exp);
  });

  readonly role = computed(() => (this.isAuthenticated() ? (this.user()?.rol ?? null) : null));

  constructor() {
    if (this.token()) {
      if (this.estaVencida(this.fechaExpiracion())) {
        this.limpiarEstadoSesion();
      } else {
        this.programarAutoLogout();
      }
    }
  }

  login(correo: string, contrasena: string) {
    return this.http.post<AuthResponse>(`${API_URL}/login`, { correo, contrasena }).pipe(
      tap((res) => this.setSession(res)),
      catchError((err) =>
        throwError(() => {
          if (err.error?.message) return err.error.message;
          if (err.status === 401)
            return 'Las credenciales de acceso son incorrectas o el usuario no está registrado en el sistema';
          if (err.status === 403) return 'Usuario deshabilitado';
          return 'Error de conexión';
        })
      )
    );
  }

  register(data: RegistroRequest) {
    return this.http.post(`${API_URL}/register`, data).pipe(
      catchError((err) =>
        throwError(() => {
          if (err.error?.message) return err.error.message;
          if (err.status === 409) return 'El RUT o el correo ya está registrado.';
          return 'No pudimos completar el registro. Intenta nuevamente.';
        })
      )
    );
  }

  solicitarRecuperacion(correo: string): Observable<void> {
    return this.http
      .post<void>(`${API_URL}/recuperar-contrasena`, { correo: correo.trim() })
      .pipe(
        map(() => undefined),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(undefined);
          }
          return throwError(() => {
            if (err.status === 0) {
              return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
            }
            if (err.error?.message) return err.error.message;
            return 'No pudimos procesar la solicitud. Inténtalo más tarde.';
          });
        })
      );
  }

  restablecerContrasena(token: string, nuevaContrasena: string): Observable<void> {
    return this.http
      .post<void>(`${API_URL}/restablecer-contrasena`, { token, nuevaContrasena })
      .pipe(
        map(() => undefined),
        catchError((err: HttpErrorResponse) =>
          throwError(() => {
            if (err.status === 0) {
              return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
            }
            if (err.error?.message) return err.error.message;
            if (err.status === 400) {
              return 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.';
            }
            return 'No pudimos restablecer tu contraseña. Inténtalo nuevamente.';
          })
        )
      );
  }

  verificarVigencia(): boolean {
    if (!this.token()) return false;
    if (this.estaVencida(this.fechaExpiracion())) {
      this.limpiarEstadoSesion();
      return false;
    }
    return true;
  }

  logout(motivo: MotivoLogout = 'manual') {
    this.limpiarEstadoSesion();
    if (motivo === 'expirada') {
      this.router.navigate(['/login'], { queryParams: { sesion: 'expirada' } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  private setSession(res: AuthResponse) {
    const expIso = res.fechaExpiracion || extraerExpiracionDeJwt(res.token);
    this.token.set(res.token);
    this.user.set(res.usuario);
    this.fechaExpiracion.set(expIso);

    localStorage.setItem('dumbo_token', res.token);
    localStorage.setItem('dumbo_user', JSON.stringify(res.usuario));
    if (expIso) {
      localStorage.setItem('dumbo_exp', expIso);
    } else {
      localStorage.removeItem('dumbo_exp');
    }

    this.programarAutoLogout();
  }

  private limpiarEstadoSesion() {
    this.limpiarTimerLogout();
    this.token.set(null);
    this.user.set(null);
    this.fechaExpiracion.set(null);
    localStorage.removeItem('dumbo_token');
    localStorage.removeItem('dumbo_user');
    localStorage.removeItem('dumbo_exp');
  }

  private programarAutoLogout() {
    this.limpiarTimerLogout();
    const exp = this.fechaExpiracion();
    if (!exp) return;

    const expMs = Date.parse(exp);
    if (Number.isNaN(expMs)) return;

    const delay = expMs - Date.now() - MARGEN_EXPIRACION_MS;
    if (delay <= 0) {
      this.logout('expirada');
      return;
    }

    const timeoutDelay = Math.min(delay, MAX_TIMEOUT_MS);
    this.logoutTimer = setTimeout(() => {
      if (this.estaVencida(this.fechaExpiracion())) {
        this.logout('expirada');
      } else {
        this.programarAutoLogout();
      }
    }, timeoutDelay);
  }

  private limpiarTimerLogout() {
    if (this.logoutTimer !== null) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  private estaVencida(expIso: string | null): boolean {
    if (!expIso) return true;
    const expMs = Date.parse(expIso);
    if (Number.isNaN(expMs)) return true;
    return expMs - MARGEN_EXPIRACION_MS <= Date.now();
  }

  private loadExpirationFromStorage(): string | null {
    const guardada = localStorage.getItem('dumbo_exp');
    if (guardada) return guardada;
    const tok = localStorage.getItem('dumbo_token');
    return tok ? extraerExpiracionDeJwt(tok) : null;
  }

  private loadUserFromStorage(): Usuario | null {
    try {
      const u = localStorage.getItem('dumbo_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }
}