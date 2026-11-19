import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TrabajadorForm } from './trabajador-form';
import { API_TRABAJADORES_URL } from '../../../core/api.config';

describe('TrabajadorForm', () => {
  let component: TrabajadorForm;
  let fixture: ComponentFixture<TrabajadorForm>;
  let httpMock: HttpTestingController;
  let router: Router;

  async function setup(modo: 'crear' | 'editar', id?: string) {
    await TestBed.configureTestingModule({
      imports: [TrabajadorForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { modo },
              paramMap: { get: () => id || null }
            }
          }
        }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrabajadorForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  describe('Modo Crear', () => {
    beforeEach(() => setup('crear'));

    it('debe tener el formulario inválido al inicio', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('debe hacer POST a API_TRABAJADORES_URL con datos normalizados y volver a lista', async () => {
      component.form.patchValue({
        rut: '12.345.678-5',
        nombres: ' Juan ',
        apellidos: ' Pérez ',
        telefono: '912345678',
        correo: 'juan@test.com',
      });

      component.onSubmit();

      const req = httpMock.expectOne(API_TRABAJADORES_URL);
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

      expect(router.navigate).toHaveBeenCalledWith(['/admin/trabajadores']);
    });
  });

  describe('Modo Editar', () => {
    beforeEach(() => setup('editar', '1'));

    it('debe precargar con GET y hacer PUT al guardar', async () => {
      // Mock del GET listar()
      const reqGet = httpMock.expectOne(API_TRABAJADORES_URL);
      reqGet.flush([{
        id: 1, rut: '12345678-5', nombres: 'Admin', apellidos: 'Test', telefono: '+56900000000', correo: 'admin@test.com', activo: true
      }]);

      await fixture.whenStable();
      expect(component.form.controls.rut.value).toBe('12.345.678-5');
      expect(component.form.controls.rut.disabled).toBe(true);

      // Editar
      component.form.patchValue({ nombres: 'Admin Modificado' });
      component.onSubmit();

      // Mock del PUT
      const reqPut = httpMock.expectOne(`${API_TRABAJADORES_URL}/1`);
      expect(reqPut.request.method).toBe('PUT');
      expect(reqPut.request.body.nombres).toBe('Admin Modificado');
      reqPut.flush({});

      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/trabajadores']);
    });
  });
});