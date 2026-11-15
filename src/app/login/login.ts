import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_HOME } from '../core/auth/roles';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('registrado') === '1') {
      this.successMessage.set(
        'Cuenta creada. Ingresa con tu correo y tu RUT sin puntos ni guion como contraseña.'
      );
    } else if (params.get('contrasenaRestablecida') === '1') {
      this.successMessage.set(
        'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.'
      );
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const { correo, contrasena } = this.form.getRawValue();

    this.auth.login(correo, contrasena).subscribe({
      next: () => {
        const rol = this.auth.role();
        if (rol && ROLE_HOME[rol]) {
          this.router.navigate([ROLE_HOME[rol]]);
        } else {
          this.auth.logout();
          this.loading.set(false);
          this.errorMessage.set('Tu rol no tiene un panel asignado.');
        }
      },
      error: (msg) => {
        this.errorMessage.set(msg);
        this.loading.set(false);
      },
    });
  }
}