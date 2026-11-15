import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const FORMATO_RUT_REGEX = /^(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-?[\dkK]$/;

export function normalizarRut(rut: string): string {
  if (!rut) return '';
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
}

export function formatearRut(rut: string): string {
  if (!rut) return '';
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;
  let cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${dv}`;
}

export function rutValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value as string | null | undefined;
    if (!rawValue) return null;

    const value = rawValue.trim();
    if (!value) return null;

    if (!FORMATO_RUT_REGEX.test(value)) {
      return { rut: true };
    }

    const limpio = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 8 || limpio.length > 9) return { rut: true };

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado =
      dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvCalculado ? null : { rut: true };
  };
}

export function normalizarTelefono(telefono: string): string {
  if (!telefono) return '';
  const numeros = telefono.replace(/\D/g, '');
  if (numeros.length === 9 && numeros.startsWith('9')) {
    return `+56${numeros}`;
  }
  if (numeros.length === 11 && numeros.startsWith('569')) {
    return `+${numeros}`;
  }
  return telefono;
}

export function telefonoChileno(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const regex = /^(?:\+?56)?\s*9\s*(?:\d\s*){8}$/;
    return regex.test(value) ? null : { telefono: true };
  };
}