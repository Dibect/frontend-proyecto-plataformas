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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem('dumbo_token'));
  readonly user = signal<Usuario | null>(this.loadUserFromStorage());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly role = computed(() => this.user()?.rol ?? null);

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

  logout() {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem('dumbo_token');
    localStorage.removeItem('dumbo_user');
    this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse) {
    this.token.set(res.token);
    this.user.set(res.usuario);
    localStorage.setItem('dumbo_token', res.token);
    localStorage.setItem('dumbo_user', JSON.stringify(res.usuario));
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