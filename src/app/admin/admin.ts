import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Panel de Administración</h1>
      <p>Bienvenido: {{ auth.user()?.nombreCompleto }}</p>
      <p>Rol: {{ auth.role() }}</p>
      <button (click)="auth.logout()">Cerrar sesión</button>
    </div>
  `
})
export class Admin {
  auth = inject(AuthService);
}