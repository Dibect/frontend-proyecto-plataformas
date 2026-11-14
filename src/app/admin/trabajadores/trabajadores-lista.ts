import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrabajadorDto, TrabajadorService } from '../Trabajador.service';
import { formatearRut } from '../../core/validators/chile.validators';

@Component({
  selector: 'app-trabajadores-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './trabajadores-lista.html',
  styleUrl: './trabajadores-lista.css',
})
export class TrabajadoresLista implements OnInit {
  private service = inject(TrabajadorService);

  // Se expone para usarla en el template (RUT con puntos y guion)
  readonly formatearRut = formatearRut;

  trabajadores = signal<TrabajadorDto[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  filtro = signal('');

  // Busca por RUT, nombre o correo. Cada palabra escrita debe aparecer en algún
  // campo; no distingue mayúsculas, tildes ni los puntos del RUT.
  trabajadoresFiltrados = computed(() => {
    const terminos = this.normalizar(this.filtro()).split(' ').filter(Boolean);
    if (terminos.length === 0) return this.trabajadores();

    return this.trabajadores().filter((t) => {
      const texto = this.normalizar(`${t.rut} ${t.nombres} ${t.apellidos} ${t.correo}`);
      return terminos.every((termino) => texto.includes(termino));
    });
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listar().subscribe({
      next: (data) => {
        this.trabajadores.set(data);
        this.loading.set(false);
      },
      error: (msg) => {
        this.errorMessage.set(msg);
        this.loading.set(false);
      },
    });
  }

  onFiltro(event: Event) {
    this.filtro.set((event.target as HTMLInputElement).value);
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .toLowerCase();
  }
}
