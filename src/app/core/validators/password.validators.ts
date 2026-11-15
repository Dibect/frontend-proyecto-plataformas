import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_N = 8;
export const MENSAJE_PASSWORD_INSEGURA =
  'La nueva contraseña no cumple los estándares de seguridad';

export interface DetalleContrasenaInsegura {
  largo: boolean;
  mayuscula: boolean;
  numero: boolean;
}

export function contrasenaSegura(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null | undefined;
    if (!value) return null;

    const faltaLargo = value.length <= PASSWORD_N;
    const faltaMayuscula = !/\p{Lu}/u.test(value);
    const faltaNumero = !/\d/.test(value);

    if (faltaLargo || faltaMayuscula || faltaNumero) {
      const detalle: DetalleContrasenaInsegura = {
        largo: faltaLargo,
        mayuscula: faltaMayuscula,
        numero: faltaNumero,
      };
      return { contrasenaInsegura: detalle };
    }

    return null;
  };
}

export function contrasenasCoinciden(campo: string, confirmacion: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const controlCampo = group.get(campo);
    const controlConfirmacion = group.get(confirmacion);

    if (!controlCampo || !controlConfirmacion) return null;

    const valorCampo = controlCampo.value as string | null | undefined;
    const valorConfirmacion = controlConfirmacion.value as string | null | undefined;

    if (!valorConfirmacion) return null;

    return valorCampo === valorConfirmacion ? null : { noCoinciden: true };
  };
}