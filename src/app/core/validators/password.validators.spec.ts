import { FormControl, FormGroup } from '@angular/forms';
import {
  PASSWORD_N,
  MENSAJE_PASSWORD_INSEGURA,
  contrasenaSegura,
  contrasenasCoinciden,
} from './password.validators';

describe('Password Validators', () => {
  describe('Constantes', () => {
    it('debe exportar PASSWORD_N = 8 y el mensaje exacto del ERS', () => {
      expect(PASSWORD_N).toBe(8);
      expect(MENSAJE_PASSWORD_INSEGURA).toBe(
        'La nueva contraseña no cumple los estándares de seguridad'
      );
    });
  });

  describe('contrasenaSegura', () => {
    const validator = contrasenaSegura();

    it('debe retornar null para valor vacío o null (delegado a Validators.required)', () => {
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });

    it('debe rechazar "Abcdefg1" (8 caracteres, no es estrictamente mayor que N=8)', () => {
      expect(validator(new FormControl('Abcdefg1'))).toEqual({
        contrasenaInsegura: {
          largo: true,
          mayuscula: false,
          numero: false,
        },
      });
    });

    it('debe aceptar "Abcdefgh1" (9 caracteres, con mayúscula y número)', () => {
      expect(validator(new FormControl('Abcdefgh1'))).toBeNull();
    });

    it('debe rechazar "abcdefgh1" (sin mayúscula)', () => {
      expect(validator(new FormControl('abcdefgh1'))).toEqual({
        contrasenaInsegura: {
          largo: false,
          mayuscula: true,
          numero: false,
        },
      });
    });

    it('debe rechazar "Abcdefghi" (sin número)', () => {
      expect(validator(new FormControl('Abcdefghi'))).toEqual({
        contrasenaInsegura: {
          largo: false,
          mayuscula: false,
          numero: true,
        },
      });
    });

    it('debe aceptar "Ñandu12345" (reconoce mayúscula Unicode Ñ)', () => {
      expect(validator(new FormControl('Ñandu12345'))).toBeNull();
    });

    it('debe rechazar "123456785" (RUT inicial sin K no tiene mayúscula)', () => {
      expect(validator(new FormControl('123456785'))).toEqual({
        contrasenaInsegura: {
          largo: false,
          mayuscula: true,
          numero: false,
        },
      });
    });

    it('debe aceptar "12345678K" (9 caracteres, números y K mayúscula)', () => {
      expect(validator(new FormControl('12345678K'))).toBeNull();
    });
  });

  describe('contrasenasCoinciden', () => {
    const crearGrupo = (nueva: string, confirmar: string) =>
      new FormGroup(
        {
          nuevaContrasena: new FormControl(nueva),
          confirmarContrasena: new FormControl(confirmar),
        },
        { validators: contrasenasCoinciden('nuevaContrasena', 'confirmarContrasena') }
      );

    it('debe retornar null cuando ambas contraseñas coinciden', () => {
      const grupo = crearGrupo('Abcdefgh1', 'Abcdefgh1');
      expect(grupo.errors).toBeNull();
    });

    it('debe retornar { noCoinciden: true } cuando las contraseñas son distintas', () => {
      const grupo = crearGrupo('Abcdefgh1', 'Abcdefgh2');
      expect(grupo.errors).toEqual({ noCoinciden: true });
    });

    it('debe retornar null si la confirmación está vacía (delegado a required del control)', () => {
      const grupo = crearGrupo('Abcdefgh1', '');
      expect(grupo.errors).toBeNull();
    });
  });
});