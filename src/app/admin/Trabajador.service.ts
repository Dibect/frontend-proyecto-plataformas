import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { API_TRABAJADORES_URL } from '../core/api.config';

export interface TrabajadorDto {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  activo: boolean;
}

// Mismos campos que el registro de cliente (RF-002). La contraseña inicial
// no se envía: el backend la genera a partir del RUT.
export type TrabajadorRequest = Omit<TrabajadorDto, 'id' | 'activo'>;

@Injectable({ providedIn: 'root' })
export class TrabajadorService {
  private http = inject(HttpClient);

  listar() {
    return this.http.get<TrabajadorDto[]>(API_TRABAJADORES_URL).pipe(catchError(this.mapError));
  }

  crear(data: TrabajadorRequest) {
    return this.http.post<TrabajadorDto>(API_TRABAJADORES_URL, data).pipe(catchError(this.mapError));
  }

  actualizar(id: number, data: TrabajadorRequest) {
    return this.http
      .put<TrabajadorDto>(`${API_TRABAJADORES_URL}/${id}`, data)
      .pipe(catchError(this.mapError));
  }

  // Habilitar / deshabilitar (el login ya responde 403 "Usuario deshabilitado")
  cambiarEstado(id: number, activo: boolean) {
    return this.http
      .patch<void>(`${API_TRABAJADORES_URL}/${id}/estado`, { activo })
      .pipe(catchError(this.mapError));
  }

  private mapError = (err: any) =>
    throwError(() => {
      if (err.error?.message) return err.error.message;
      if (err.status === 409) return 'El RUT o el correo ya está registrado.';
      if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
      return 'No pudimos completar la operación. Intenta nuevamente.';
    });
}