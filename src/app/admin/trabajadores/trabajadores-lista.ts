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
  errorAccion = signal<string | null>(null);
  cambiandoEstadoId = signal<number | null>(null);
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

  cambiarEstado(trabajador: TrabajadorDto) {
    const accion = trabajador.activo ? 'deshabilitar' : 'habilitar';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} al trabajador ${trabajador.nombres}?`)) {
      return;
    }

    this.errorAccion.set(null);
    this.cambiandoEstadoId.set(trabajador.id);

    this.service.cambiarEstado(trabajador.id, !trabajador.activo).subscribe({
      next: () => {
        this.trabajadores.update(lista => 
          lista.map(t => t.id === trabajador.id ? { ...t, activo: !t.activo } : t)
        );
        this.cambiandoEstadoId.set(null);
      },
      error: (msg) => {
        this.errorAccion.set(msg);
        this.cambiandoEstadoId.set(null);
      }
    });
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .toLowerCase();
  }
}
