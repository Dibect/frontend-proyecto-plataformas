import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Register } from './register';
import { API_URL } from '../core/api.config';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe tener el formulario inválido inicialmente', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('debe redireccionar a login en autoregistro tras registrar con éxito', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.modo.set('autoregistro');

    component.form.patchValue({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com'
    });

    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '+56912345678',
      correo: 'juan@test.com'
    });

    req.flush({});

    await fixture.whenStable();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { registrado: '1' } });
  });

  it('debe mostrar mensaje y resetear form en modo trabajador tras éxito', async () => {
    component.modo.set('trabajador');

    component.form.patchValue({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com'
    });

    component.onSubmit();
    httpMock.expectOne(`${API_URL}/register`).flush({});

    await fixture.whenStable();
    expect(component.successMessage()).toContain('Cliente registrado correctamente');
    expect(component.form.value.rut).toBe('');
  });

  it('debe mostrar error 409 desde el backend', async () => {
    component.form.patchValue({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com'
    });

    component.onSubmit();
    httpMock.expectOne(`${API_URL}/register`).flush(null, { status: 409, statusText: 'Conflict' });

    await fixture.whenStable();
    expect(component.errorMessage()).toBe('El RUT o el correo ya está registrado.');
  });
});