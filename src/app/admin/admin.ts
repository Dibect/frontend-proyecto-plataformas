import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Panel de Administración</h1>
      <p>Bienvenido: {{ auth.user()?.nombreCompleto }}</p>
      <p>Rol: {{ auth.role() }}</p>
      <div style="margin-bottom: 20px;">
        <a routerLink="/admin/trabajadores">Gestionar trabajadores</a>
      </div>
      <button (click)="auth.logout()">Cerrar sesión</button>
    </div>
  `
})
export class Admin {
  auth = inject(AuthService);
}