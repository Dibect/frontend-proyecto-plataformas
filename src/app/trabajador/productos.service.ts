import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export type EstadoInventario = 'todos' | 'disponible' | 'stock-bajo' | 'sin-stock';

export interface ProductoInventario {
  id: number;
  sku: string;
  nombre: string;
  categoriaId: number | null;
  categoriaNombre: string;
  precio: number;
  stock: number;
  urlImagen: string | null;
}

export interface CategoriaInventario {
  id: number;
  nombre: string;
}

export interface ResumenInventario {
  totalProductos: number;
  unidadesEnStock: number;
  productosStockBajo: number;
}

export interface ListadoInventario {
  productos: ProductoInventario[];
  categorias: CategoriaInventario[];
  resumen: ResumenInventario;
  pagina: number;
  tamanoPagina: number;
  total: number;
}

export interface CrearProductoRequest {
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  urlImagen: string | null;
  presentacion: string | null;
  precioAnterior: number | null;
  categoriaId: number | null;
}

export interface ErrorFilaImportacion {
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacionProductos {
  filasLeidas: number;
  productosImportados: number;
  filasRechazadas: number;
  errores: ErrorFilaImportacion[];
}

export interface FiltrosInventario {
  pagina: number;
  tamanoPagina: number;
  busqueda: string;
  categoriaId: number | null;
  estado: EstadoInventario;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE}/products`;

  listar(filtros: FiltrosInventario): Observable<ListadoInventario> {
    let params = new HttpParams()
      .set('pagina', filtros.pagina)
      .set('tamanoPagina', filtros.tamanoPagina)
      .set('estado', filtros.estado);

    if (filtros.busqueda.trim()) {
      params = params.set('busqueda', filtros.busqueda.trim());
    }
    if (filtros.categoriaId !== null) {
      params = params.set('categoriaId', filtros.categoriaId);
    }

    return this.http.get<ListadoInventario>(this.url, { params });
  }

  crear(request: CrearProductoRequest): Observable<unknown> {
    return this.http.post(this.url, request);
  }

  importarCsv(archivo: File): Observable<ResultadoImportacionProductos> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return this.http.post<ResultadoImportacionProductos>(`${this.url}/import`, datos);
  }
}
