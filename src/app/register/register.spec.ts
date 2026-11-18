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
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe tener el formulario inválido inicialmente', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const boton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.form.invalid).toBe(true);
    expect(boton.disabled).toBe(false);
  });

  it('debe marcar errores y enfocar el primer campo inválido al enviar incompleto', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nombresInput = compiled.querySelector('#nombres') as HTMLInputElement;
    const focusSpy = vi.spyOn(nombresInput, 'focus');

    component.form.patchValue({
      rut: '12345678-5',
      nombres: '',
    });

    component.onSubmit();
    fixture.detectChanges();

    httpMock.expectNone(`${API_URL}/register`);
    expect(component.form.controls.nombres.touched).toBe(true);
    expect(component.form.controls.correo.touched).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('debe rechazar un RUT con formato inválido', () => {
    component.form.patchValue({
      rut: 'xx12345678-5yy',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com',
    });

    expect(component.form.controls.rut.invalid).toBe(true);
    expect(component.form.controls.rut.errors).toEqual({ rut: true });
  });

  it('debe redireccionar a login en autoregistro tras registrar con éxito', async () => {
    component.modo.set('autoregistro');

    component.form.patchValue({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com',
    });

    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '+56912345678',
      correo: 'juan@test.com',
    });

    req.flush({});

    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registrado: '1' },
    });
  });

  it('debe mostrar mensaje, resetear form y enfocar rut en modo trabajador tras éxito', async () => {
    component.modo.set('trabajador');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rutInput = compiled.querySelector('#rut') as HTMLInputElement;
    const focusSpy = vi.spyOn(rutInput, 'focus');

    component.form.patchValue({
      rut: '12.345.678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com',
    });

    component.onSubmit();
    httpMock.expectOne(`${API_URL}/register`).flush({});

    await fixture.whenStable();
    expect(component.successMessage()).toContain('12345678-5');
    expect(component.successMessage()).toContain('Cliente');
    expect(component.form.value.rut).toBe('');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('debe mostrar error 409 desde el backend', async () => {
    component.form.patchValue({
      rut: '12345678-5',
      nombres: 'Juan',
      apellidos: 'Pérez',
      telefono: '912345678',
      correo: 'juan@test.com',
    });

    component.onSubmit();
    httpMock.expectOne(`${API_URL}/register`).flush(null, { status: 409, statusText: 'Conflict' });

    await fixture.whenStable();
    expect(component.errorMessage()).toBe('El RUT o el correo ya está registrado.');
  });
});