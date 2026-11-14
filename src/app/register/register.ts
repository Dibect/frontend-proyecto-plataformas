import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, RegistroRequest } from '../core/auth/auth.service';
import { rutValido, telefonoChileno, formatearRut, normalizarRut, normalizarTelefono } from '../core/validators/chile.validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  modo = signal<'autoregistro' | 'trabajador'>('autoregistro');
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    rut: ['', [Validators.required, rutValido()]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    telefono: ['', [Validators.required, telefonoChileno()]],
    correo: ['', [Validators.required, Validators.email]]
  });

  ngOnInit() {
    this.modo.set(this.route.snapshot.data['modo'] || 'autoregistro');
  }

  onRutBlur() {
    const rutControl = this.form.controls.rut;
    if (rutControl.value) {
      rutControl.setValue(formatearRut(rutControl.value));
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const raw = this.form.getRawValue();
    const data: RegistroRequest = {
      rut: normalizarRut(raw.rut),
      nombres: raw.nombres.trim(),
      apellidos: raw.apellidos.trim(),
      telefono: normalizarTelefono(raw.telefono),
      correo: raw.correo.trim()
    };

    this.auth.register(data).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.modo() === 'autoregistro') {
          this.router.navigate(['/login'], { queryParams: { registrado: '1' } });
        } else {
          this.successMessage.set('Cliente registrado correctamente. Su contraseña inicial es su RUT sin puntos ni guion.');
          this.form.reset();
        }
      },
      error: (msg) => {
        this.errorMessage.set(msg);
        this.loading.set(false);
      }
    });
  }
}