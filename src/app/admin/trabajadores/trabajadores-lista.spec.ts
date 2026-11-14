import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TrabajadoresLista } from './trabajadores-lista';
import { TrabajadorDto } from '../Trabajador.service';
import { API_TRABAJADORES_URL } from '../../core/api.config';

const TRABAJADORES: TrabajadorDto[] = [
  {
    id: 1,
    rut: '12345678-5',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Soto',
    telefono: '+56912345678',
    correo: 'juan@test.com',
    activo: true,
  },
  {
    id: 2,
    rut: '11111111-1',
    nombres: 'María',
    apellidos: 'González',
    telefono: '+56987654321',
    correo: 'maria@test.com',
    activo: false,
  },
];

describe('TrabajadoresLista', () => {
  let component: TrabajadoresLista;
  let fixture: ComponentFixture<TrabajadoresLista>;
  let httpMock: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const filas = () => el().querySelectorAll('tbody tr');

  async function actualizar() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function cargarTrabajadores(data: TrabajadorDto[] = TRABAJADORES) {
    httpMock.expectOne(API_TRABAJADORES_URL).flush(data);
    await actualizar();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrabajadoresLista],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TrabajadoresLista);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // dispara ngOnInit y la petición GET
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe mostrar "Cargando" mientras espera la respuesta', () => {
    expect(el().textContent).toContain('Cargando trabajadores');
    httpMock.expectOne(API_TRABAJADORES_URL).flush([]);
  });

  it('debe mostrar una fila por trabajador con el RUT formateado y su estado', async () => {
    await cargarTrabajadores();

    expect(filas().length).toBe(2);
    expect(filas()[0].textContent).toContain('12.345.678-5');
    expect(filas()[0].textContent).toContain('Juan Carlos Pérez Soto');
    expect(filas()[0].textContent).toContain('Activo');
    expect(filas()[1].textContent).toContain('Deshabilitado');
  });

  it('debe filtrar sin distinguir tildes, mayúsculas ni puntos del RUT', async () => {
    await cargarTrabajadores();

    component.filtro.set('MARIA');
    await actualizar();
    expect(filas().length).toBe(1);
    expect(filas()[0].textContent).toContain('María');

    component.filtro.set('juan perez');
    await actualizar();
    expect(filas().length).toBe(1);
    expect(filas()[0].textContent).toContain('Juan Carlos');

    component.filtro.set('12.345.678');
    await actualizar();
    expect(filas().length).toBe(1);
  });

  it('debe avisar cuando ningún trabajador coincide con la búsqueda', async () => {
    await cargarTrabajadores();

    component.filtro.set('zzz');
    await actualizar();

    expect(filas().length).toBe(0);
    expect(el().textContent).toContain('Ningún trabajador coincide');
  });

  it('debe mostrar un mensaje cuando aún no hay trabajadores', async () => {
    await cargarTrabajadores([]);

    expect(el().textContent).toContain('Aún no hay trabajadores registrados');
    expect(el().querySelector('table')).toBeNull();
  });

  it('debe mostrar el error y permitir reintentar', async () => {
    httpMock
      .expectOne(API_TRABAJADORES_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await actualizar();

    expect(component.errorMessage()).toBe('No pudimos completar la operación. Intenta nuevamente.');
    expect(el().querySelector('[role="alert"]')).not.toBeNull();

    (el().querySelector('.alert button') as HTMLButtonElement).click();
    await cargarTrabajadores();

    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(filas().length).toBe(2);
  });
});
