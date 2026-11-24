import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import {
  CategoriaInventario,
  CrearProductoRequest,
  EstadoInventario,
  ListadoInventario,
  ProductosService,
  ResultadoImportacionProductos,
} from '../productos.service';

interface FormularioProducto {
  sku: string;
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  urlImagen: string;
  presentacion: string;
  precioAnterior: string;
  categoriaId: string;
}

const FORMULARIO_VACIO: FormularioProducto = {
  sku: '',
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '',
  urlImagen: '',
  presentacion: '',
  precioAnterior: '',
  categoriaId: '',
};

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inventario.html',
})
export class Inventario implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly productosService = inject(ProductosService);

  readonly listado = signal<ListadoInventario | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly importando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly categoriaId = signal<number | null>(null);
  readonly estado = signal<EstadoInventario>('todos');
  readonly pagina = signal(1);
  readonly tamanoPagina = 5;
  readonly modalProductoAbierto = signal(false);
  readonly confirmarProductoAbierto = signal(false);
  readonly confirmarCsvAbierto = signal(false);
  readonly formulario = signal<FormularioProducto>({ ...FORMULARIO_VACIO });
  readonly archivoPendiente = signal<File | null>(null);
  readonly resultadoImportacion = signal<ResultadoImportacionProductos | null>(null);
  readonly cantidadPaginas = computed(() =>
    Math.max(1, Math.ceil((this.listado()?.total ?? 0) / this.tamanoPagina))
  );
  readonly inicioRango = computed(() =>
    this.listado()?.total ? (this.pagina() - 1) * this.tamanoPagina + 1 : 0
  );
  readonly finRango = computed(() =>
    Math.min(this.pagina() * this.tamanoPagina, this.listado()?.total ?? 0)
  );

  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;
  private solicitudActiva = 0;

  ngOnInit(): void {
    this.cargarProductos();
  }

  ngOnDestroy(): void {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
  }

  cargarProductos(): void {
    const solicitud = ++this.solicitudActiva;
    this.cargando.set(true);
    this.error.set(null);

    this.productosService
      .listar({
        pagina: this.pagina(),
        tamanoPagina: this.tamanoPagina,
        busqueda: this.busqueda(),
        categoriaId: this.categoriaId(),
        estado: this.estado(),
      })
      .subscribe({
        next: (listado) => {
          if (solicitud !== this.solicitudActiva) return;
          this.listado.set(listado);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          if (solicitud !== this.solicitudActiva) return;
          this.error.set(this.mensajeError(err));
          this.cargando.set(false);
        },
      });
  }

  buscar(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
    this.pagina.set(1);
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.cargarProductos(), 250);
  }

  cambiarCategoria(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.categoriaId.set(valor ? Number(valor) : null);
    this.pagina.set(1);
    this.cargarProductos();
  }

  cambiarEstado(event: Event): void {
    this.estado.set((event.target as HTMLSelectElement).value as EstadoInventario);
    this.pagina.set(1);
    this.cargarProductos();
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.cantidadPaginas()) return;
    this.pagina.set(pagina);
    this.cargarProductos();
  }

  abrirFormulario(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.formulario.set({ ...FORMULARIO_VACIO });
    this.modalProductoAbierto.set(true);
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.modalProductoAbierto.set(false);
    this.confirmarProductoAbierto.set(false);
  }

  actualizarCampo(campo: keyof FormularioProducto, event: Event): void {
    const valor = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this.formulario.update((actual) => ({ ...actual, [campo]: valor }));
  }

  solicitarConfirmacionProducto(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    this.confirmarProductoAbierto.set(true);
  }

  confirmarCreacion(): void {
    const formulario = this.formulario();
    const request: CrearProductoRequest = {
      sku: formulario.sku.trim(),
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      precio: Number(formulario.precio),
      stock: Number(formulario.stock),
      urlImagen: formulario.urlImagen.trim() || null,
      presentacion: formulario.presentacion.trim() || null,
      precioAnterior: formulario.precioAnterior ? Number(formulario.precioAnterior) : null,
      categoriaId: formulario.categoriaId ? Number(formulario.categoriaId) : null,
    };

    this.guardando.set(true);
    this.error.set(null);
    this.productosService.crear(request).subscribe({
      next: () => {
        this.guardando.set(false);
        this.confirmarProductoAbierto.set(false);
        this.modalProductoAbierto.set(false);
        this.mensaje.set('Producto agregado al inventario.');
        this.pagina.set(1);
        this.cargarProductos();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.confirmarProductoAbierto.set(false);
        this.error.set(this.mensajeError(err));
      },
    });
  }

  seleccionarCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith('.csv')) {
      this.error.set('Selecciona un archivo con formato .csv.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.error.set('El archivo no puede superar los 5 MB.');
      return;
    }

    this.error.set(null);
    this.mensaje.set(null);
    this.archivoPendiente.set(archivo);
    this.confirmarCsvAbierto.set(true);
  }

  cancelarImportacion(): void {
    if (this.importando()) return;
    this.confirmarCsvAbierto.set(false);
    this.archivoPendiente.set(null);
  }

  confirmarImportacion(): void {
    const archivo = this.archivoPendiente();
    if (!archivo) return;

    this.importando.set(true);
    this.error.set(null);
    this.resultadoImportacion.set(null);
    this.productosService.importarCsv(archivo).subscribe({
      next: (resultado) => {
        this.importando.set(false);
        this.confirmarCsvAbierto.set(false);
        this.archivoPendiente.set(null);
        this.resultadoImportacion.set(resultado);
        this.mensaje.set(
          `Importación terminada: ${resultado.productosImportados} productos agregados y ${resultado.filasRechazadas} filas con errores.`
        );
        if (resultado.productosImportados > 0) {
          this.pagina.set(1);
          this.cargarProductos();
        }
      },
      error: (err: unknown) => {
        this.importando.set(false);
        this.confirmarCsvAbierto.set(false);
        this.archivoPendiente.set(null);
        this.error.set(this.mensajeError(err));
      },
    });
  }

  descargarPlantilla(): void {
    const csv =
      '\uFEFFSku,Nombre,Descripcion,Precio,Stock,UrlImagen,Presentacion,PrecioAnterior,CategoriaId\r\n' +
      'FRU-001,Manzana Royal Gala,Manzana fresca,2490,24,,1 kg,,\r\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-productos.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  formatoPrecio(valor: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  estadoProducto(stock: number): string {
    if (stock === 0) return 'Sin stock';
    return stock <= 10 ? 'Stock bajo' : 'Disponible';
  }

  claseEstado(stock: number): string {
    if (stock === 0) return 'status--empty';
    return stock <= 10 ? 'status--low' : 'status--available';
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return (
        error.error?.detail ||
        error.error?.title ||
        error.error?.message ||
        (error.status === 0
          ? 'No hay conexión con el servidor. Intenta nuevamente.'
          : 'No se pudo completar la operación.')
      );
    }
    return 'No se pudo completar la operación.';
  }
}
