import { FormControl } from '@angular/forms';
import {
  rutValido,
  normalizarRut,
  formatearRut,
  telefonoChileno,
  normalizarTelefono,
} from './chile.validators';

describe('Chile Validators', () => {
  describe('rutValido', () => {
    it('debe validar RUTs correctos con o sin puntos y guion', () => {
      const validator = rutValido();
      expect(validator(new FormControl('12.345.678-5'))).toBeNull();
      expect(validator(new FormControl('12345678-5'))).toBeNull();
      expect(validator(new FormControl('123456785'))).toBeNull();
      expect(validator(new FormControl('9.111.111-k'))).toBeNull();
      expect(validator(new FormControl('9111111K'))).toBeNull();
    });

    it('debe rechazar RUTs con dígito verificador incorrecto o formato inválido (ej. caracteres extra)', () => {
      const validator = rutValido();
      expect(validator(new FormControl('12.345.678-0'))).toEqual({ rut: true });
      expect(validator(new FormControl('xx12345678-5yy'))).toEqual({ rut: true });
      expect(validator(new FormControl('12.345678-5'))).toEqual({ rut: true });
      expect(validator(new FormControl('12--345678-5'))).toEqual({ rut: true });
      expect(validator(new FormControl('123'))).toEqual({ rut: true });
      expect(validator(new FormControl('12345678901'))).toEqual({ rut: true });
      expect(validator(new FormControl('abcdefghi'))).toEqual({ rut: true });
    });

    it('debe aceptar valor vacío (delegado a Validators.required)', () => {
      const validator = rutValido();
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });
  });

  describe('normalizarRut y formatearRut', () => {
    it('debe normalizar a formato sin puntos y con guion', () => {
      expect(normalizarRut('12.345.678-5')).toBe('12345678-5');
      expect(normalizarRut('123456785')).toBe('12345678-5');
      expect(normalizarRut('9111111k')).toBe('9111111-K');
    });

    it('debe formatear a formato con puntos y guion', () => {
      expect(formatearRut('123456785')).toBe('12.345.678-5');
      expect(formatearRut('12345678-5')).toBe('12.345.678-5');
      expect(formatearRut('9111111K')).toBe('9.111.111-K');
    });
  });

  describe('telefonoChileno', () => {
    it('debe aceptar teléfonos válidos', () => {
      const validator = telefonoChileno();
      expect(validator(new FormControl('+56912345678'))).toBeNull();
      expect(validator(new FormControl('56912345678'))).toBeNull();
      expect(validator(new FormControl('912345678'))).toBeNull();
      expect(validator(new FormControl('+56 9 1234 5678'))).toBeNull();
    });

    it('debe rechazar teléfonos inválidos', () => {
      const validator = telefonoChileno();
      expect(validator(new FormControl('+56812345678'))).toEqual({ telefono: true });
      expect(validator(new FormControl('91234567'))).toEqual({ telefono: true });
      expect(validator(new FormControl('texto'))).toEqual({ telefono: true });
    });

    it('debe aceptar valor vacío (delegado a Validators.required)', () => {
      const validator = telefonoChileno();
      expect(validator(new FormControl(''))).toBeNull();
    });
  });

  describe('normalizarTelefono', () => {
    it('debe normalizar al formato +569...', () => {
      expect(normalizarTelefono('+56 9 1234 5678')).toBe('+56912345678');
      expect(normalizarTelefono('912345678')).toBe('+56912345678');
      expect(normalizarTelefono('56912345678')).toBe('+56912345678');
    });
  });
});