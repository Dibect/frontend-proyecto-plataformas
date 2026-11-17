import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Login } from './login';
import { API_URL } from '../core/api.config';
import { AuthService } from '../core/auth/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let httpMock: HttpTestingController;
  let router: Router;
  let authService: AuthService;

  const configurarComponente = async (queryParams: Record<string, string> = {}) => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  afterEach(() => {
    authService?.logout();
    httpMock?.verify();
    localStorage.clear();
  });

  it('should create', async () => {
    await configurarComponente();
    expect(component).toBeTruthy();
  });

  describe('redirección por rol', () => {
    it.each([
      ['Administrador', '/admin'],
      ['Trabajador', '/trabajador'],
      ['Cliente', '/cliente'],
    ])('debe navegar a %s -> %s tras login exitoso', async (rol, rutaEsperada) => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'usuario@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      expect(req.request.method).toBe('POST');
      req.flush({
        token: 'jwt-valido',
        fechaExpiracion: new Date(Date.now() + 60_000).toISOString(),
        usuario: {
          id: 1,
          correo: 'usuario@dumbo.cl',
          nombreCompleto: 'Usuario Prueba',
          rol,
        },
      });

      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith([rutaEsperada]);
    });

    it('debe cerrar sesión y mostrar error si el rol no tiene panel asignado', async () => {
      await configurarComponente();
      const logoutSpy = vi.spyOn(authService, 'logout');

      component.form.patchValue({
        correo: 'raro@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush({
        token: 'jwt-valido',
        fechaExpiracion: new Date(Date.now() + 60_000).toISOString(),
        usuario: {
          id: 99,
          correo: 'raro@dumbo.cl',
          nombreCompleto: 'Rol Raro',
          rol: 'RolInexistente',
        },
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(logoutSpy).toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Tu rol no tiene un panel asignado.');
    });
  });

  describe('manejo de errores', () => {
    it('debe mostrar error de credenciales en 401', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'cliente@dumbo.cl',
        contrasena: 'malapass',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe(
        'Las credenciales de acceso son incorrectas o el usuario no está registrado en el sistema'
      );
    });

    it('debe mostrar error de usuario deshabilitado en 403', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'bloqueado@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush({ message: 'Disabled' }, { status: 403, statusText: 'Forbidden' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Usuario deshabilitado');
    });

    it('debe mostrar error de red cuando status es 0', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'cliente@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.error(new ProgressEvent('error'));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('No hay conexión con el servidor');
    });

    it('debe mostrar error del servidor cuando status es 500', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'cliente@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('El servidor tuvo un problema. Inténtalo más tarde.');
    });
  });

  describe('validación de formulario', () => {
    it('debe mantener el botón habilitado mientras no esté cargando', async () => {
      await configurarComponente();
      const compiled = fixture.nativeElement as HTMLElement;
      const boton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(component.form.invalid).toBe(true);
      expect(boton.disabled).toBe(false);
    });

    it('debe mostrar errores y enfocar el primer campo inválido al enviar vacío', async () => {
      await configurarComponente();
      const compiled = fixture.nativeElement as HTMLElement;
      const correoInput = compiled.querySelector('#correo') as HTMLInputElement;
      const focusSpy = vi.spyOn(correoInput, 'focus');

      component.onSubmit();
      fixture.detectChanges();

      httpMock.expectNone(`${API_URL}/login`);
      expect(component.form.controls.correo.touched).toBe(true);
      expect(component.form.controls.contrasena.touched).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
      expect(compiled.textContent).toContain('El correo es obligatorio');
      expect(compiled.textContent).toContain('La contraseña es obligatoria');
    });

    it('debe enfocar contraseña si el correo ya es válido', async () => {
      await configurarComponente();
      const compiled = fixture.nativeElement as HTMLElement;
      const contrasenaInput = compiled.querySelector('#contrasena') as HTMLInputElement;
      const focusSpy = vi.spyOn(contrasenaInput, 'focus');

      component.form.patchValue({ correo: 'valido@dumbo.cl', contrasena: '' });
      component.onSubmit();
      fixture.detectChanges();

      httpMock.expectNone(`${API_URL}/login`);
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('avisos por query params', () => {
    it('debe mostrar aviso de cuenta creada con registrado=1', async () => {
      await configurarComponente({ registrado: '1' });
      expect(component.successMessage()).toContain('Cuenta creada');
    });

    it('debe mostrar aviso de contraseña restablecida con contrasenaRestablecida=1', async () => {
      await configurarComponente({ contrasenaRestablecida: '1' });
      expect(component.successMessage()).toContain('Contraseña actualizada correctamente');
    });

    it('debe mostrar aviso de sesión expirada con sesion=expirada', async () => {
      await configurarComponente({ sesion: 'expirada' });
      expect(component.successMessage()).toBe('Tu sesión expiró. Inicia sesión nuevamente.');
    });
  });
});