import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TrabajadorService, TrabajadorRequest } from '../../Trabajador.service';
import {
  rutValido,
  telefonoChileno,
  formatearRut,
  normalizarRut,
  normalizarTelefono,
} from '../../../core/validators/chile.validators';

@Component({
  selector: 'app-trabajador-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './trabajador-form.html',
  styleUrl: './trabajador-form.css',
})
export class TrabajadorForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TrabajadorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  modo = signal<'crear' | 'editar'>('crear');
  idEdicion = signal<number | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  errorNotFound = signal(false);

  form = this.fb.nonNullable.group({
    rut: ['', [Validators.required, rutValido()]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    telefono: ['', [Validators.required, telefonoChileno()]],
    correo: ['', [Validators.required, Validators.email]],
  });

  ngOnInit() {
    const modo = this.route.snapshot.data['modo'] || 'crear';
    this.modo.set(modo);

    if (modo === 'editar') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.idEdicion.set(id);
      this.cargarTrabajador(id);
    }
  }

  cargarTrabajador(id: number) {
    this.loading.set(true);
    this.service.listar().subscribe({
      next: (trabajadores) => {
        const t = trabajadores.find(x => x.id === id);
        if (t) {
          this.form.patchValue({
            rut: formatearRut(t.rut),
            nombres: t.nombres,
            apellidos: t.apellidos,
            telefono: t.telefono,
            correo: t.correo,
          });
          // El RUT no se edita por seguridad en la base de datos
          this.form.controls.rut.disable();
        } else {
          this.errorNotFound.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorNotFound.set(true);
        this.loading.set(false);
      }
    });
  }

  onRutBlur() {
    const rutControl = this.form.controls.rut;
    if (rutControl.value && rutControl.valid) {
      rutControl.setValue(formatearRut(rutControl.value));
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.enfocarPrimerInvalido();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const data: TrabajadorRequest = {
      rut: normalizarRut(raw.rut),
      nombres: raw.nombres.trim(),
      apellidos: raw.apellidos.trim(),
      telefono: normalizarTelefono(raw.telefono),
      correo: raw.correo.trim(),
    };

    const request$ = this.modo() === 'crear' 
      ? this.service.crear(data)
      : this.service.actualizar(this.idEdicion()!, data);

    request$.subscribe({
      next: () => {
        this.router.navigate(['/admin/trabajadores']);
      },
      error: (msg: string) => {
        this.errorMessage.set(msg);
        this.loading.set(false);
      },
    });
  }

  private enfocarPrimerInvalido() {
    const ordenCampos: (keyof typeof this.form.controls)[] = [
      'rut',
      'nombres',
      'apellidos',
      'telefono',
      'correo',
    ];
    for (const nombre of ordenCampos) {
      if (this.form.controls[nombre].invalid) {
        this.enfocarCampo(nombre);
        break;
      }
    }
  }

  private enfocarCampo(id: string) {
    const input = this.host.nativeElement.querySelector<HTMLInputElement>(`#${id}`);
    input?.focus();
  }
}