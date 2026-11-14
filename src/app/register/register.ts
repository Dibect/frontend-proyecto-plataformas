import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    confirmarContrasena: ['', Validators.required]
  });

  onSubmit() {
    if (this.form.invalid) return;

    const { contrasena, confirmarContrasena } = this.form.getRawValue();
    
    if (contrasena !== confirmarContrasena) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { nombre, correo } = this.form.getRawValue();
    
    /*
    this.auth.register(nombre, correo, contrasena).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (msg) => {
        this.errorMessage.set(msg);
        this.loading.set(false);
      }
    });
    */
  }
}