import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
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
      tap(res => this.setSession(res)),
      catchError(err => throwError(() => err.error?.message || 'Error de conexión'))
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