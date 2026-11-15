import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import {
  contrasenaSegura,
  contrasenasCoinciden,
  MENSAJE_PASSWORD_INSEGURA,
  PASSWORD_N,
} from '../core/validators/password.validators';

@Component({
  selector: 'app-restablecer-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer-contrasena.html',
  styleUrl: './restablecer-contrasena.css',
})
export class RestablecerContrasena implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly passwordN = PASSWORD_N;
  readonly mensajePasswordInsegura = MENSAJE_PASSWORD_INSEGURA;

  token = signal<string | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      nuevaContrasena: ['', [Validators.required, contrasenaSegura()]],
      confirmarContrasena: ['', [Validators.required]],
    },
    {
      validators: contrasenasCoinciden('nuevaContrasena', 'confirmarContrasena'),
    }
  );

  ngOnInit() {
    const tokenParam = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(tokenParam.length > 0 ? tokenParam : null);
  }

  onSubmit() {
    if (!this.token()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { nuevaContrasena } = this.form.getRawValue();

    this.auth.restablecerContrasena(this.token()!, nuevaContrasena).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { contrasenaRestablecida: '1' } });
      },
      error: (msg: string) => {
        this.loading.set(false);
        this.errorMessage.set(msg);
      },
    });
  }
}