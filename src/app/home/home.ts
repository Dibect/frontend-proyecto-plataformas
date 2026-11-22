import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_HOME } from '../core/auth/roles';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busqueda = signal('');
  readonly cantidadCarrito = signal(0);

  // Si hay sesión activa, "Mi cuenta" lleva al panel del rol; si no, a /login
  readonly rutaCuenta = computed(() => {
    const rol = this.auth.role();
    return rol && ROLE_HOME[rol] ? ROLE_HOME[rol] : '/login';
  });

  // Muestra "Hola, PrimerNombre" si hay sesión; si no, "Mi cuenta"
  readonly etiquetaCuenta = computed(() => {
    if (!this.auth.isAuthenticated()) return 'Mi cuenta';
    const nombre = this.auth.user()?.nombreCompleto?.trim();
    if (!nombre) return 'Mi cuenta';
    return `Hola, ${nombre.split(' ')[0]}`;
  });

  onInputBusqueda(event: Event) {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  onBuscar(event: Event) {
    event.preventDefault();
    const termino = this.busqueda().trim();
    if (!termino) return;
    // Cuando creen el catálogo, pueden navegar con queryParams: { q: termino }
    console.log('Buscando:', termino);
  }

  irAComprar() {
    // Provisional hasta crear la ruta /catalogo o la sección de productos abajo
    this.router.navigate([this.rutaCuenta()]);
  }
}