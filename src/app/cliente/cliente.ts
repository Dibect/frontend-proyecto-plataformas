import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cliente.html',
  styleUrl: './cliente.css',
})
export class Cliente {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly iniciales = computed(() => {
    const nombre = this.auth.user()?.nombreCompleto?.trim() ?? '';
    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'U';
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  });

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}