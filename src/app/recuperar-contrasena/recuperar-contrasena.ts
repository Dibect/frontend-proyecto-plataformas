import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

export const MENSAJE_EXITO_RECUPERACION =
  'Si el correo está registrado, te enviamos las instrucciones para restablecer tu contraseña.';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.css',
})
export class RecuperarContrasena {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { correo } = this.form.getRawValue();

    this.auth.solicitarRecuperacion(correo).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(MENSAJE_EXITO_RECUPERACION);
      },
      error: (msg: string) => {
        this.loading.set(false);
        this.errorMessage.set(msg);
      },
    });
  }
}