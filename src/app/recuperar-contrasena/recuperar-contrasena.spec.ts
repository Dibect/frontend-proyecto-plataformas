import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RecuperarContrasena, MENSAJE_EXITO_RECUPERACION } from './recuperar-contrasena';
import { API_URL } from '../core/api.config';

describe('RecuperarContrasena', () => {
  let component: RecuperarContrasena;
  let fixture: ComponentFixture<RecuperarContrasena>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarContrasena],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarContrasena);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear el componente con formulario inválido inicialmente', () => {
    expect(component).toBeTruthy();
    expect(component.form.invalid).toBe(true);
  });

  it('no debe llamar al backend si el correo es inválido y debe marcar el campo como touched', () => {
    component.form.patchValue({ correo: 'correo-invalido' });
    component.onSubmit();

    httpMock.expectNone(`${API_URL}/recuperar-contrasena`);
    expect(component.form.controls.correo.touched).toBe(true);
  });

  it('debe mostrar el mensaje genérico de éxito cuando el backend responde 204', async () => {
    component.form.patchValue({ correo: 'cliente@dumbo.cl' });
    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'cliente@dumbo.cl' });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.successMessage()).toBe(MENSAJE_EXITO_RECUPERACION);
    expect(component.errorMessage()).toBeNull();
  });

  it('debe mostrar el MISMO mensaje genérico de éxito aunque el backend responda 404', async () => {
    component.form.patchValue({ correo: 'noexiste@dumbo.cl' });
    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
    req.flush(null, { status: 404, statusText: 'Not Found' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.successMessage()).toBe(MENSAJE_EXITO_RECUPERACION);
    expect(component.errorMessage()).toBeNull();
  });

  it('debe mostrar error si falla la conexión de red (status 0)', async () => {
    component.form.patchValue({ correo: 'cliente@dumbo.cl' });
    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/recuperar-contrasena`);
    req.error(new ProgressEvent('error'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('No hay conexión con el servidor');
    expect(component.successMessage()).toBeNull();
  });
});