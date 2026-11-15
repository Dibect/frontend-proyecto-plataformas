import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Login } from './login';
import { API_URL } from '../core/api.config';
import { AuthService } from '../core/auth/auth.service';

describe('Login (T5)', () => {
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

  describe('Navegación según rol tras login exitoso', () => {
    it.each([
      ['Administrador', '/admin'],
      ['Trabajador', '/trabajador'],
      ['Cliente', '/cliente'],
    ])('debe redirigir a %s hacia %s', async (rol, rutaEsperada) => {
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

    it('debe hacer logout y mostrar aviso si el rol es desconocido', async () => {
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
          rol: 'SupervisorInexistente',
        },
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(logoutSpy).toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Tu rol no tiene un panel asignado.');
    });
  });

  describe('Mensajes de error exactos del ERS y de red', () => {
    it('debe mostrar el mensaje exacto del ERS en 401 incluso si el backend envía otro message', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'cliente@dumbo.cl',
        contrasena: 'malapass',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(
        { message: 'Invalid credentials from backend' },
        { status: 401, statusText: 'Unauthorized' }
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe(
        'Las credenciales de acceso son incorrectas o el usuario no está registrado en el sistema'
      );
    });

    it('debe mostrar "Usuario deshabilitado" en 403 incluso si el backend envía otro message', async () => {
      await configurarComponente();

      component.form.patchValue({
        correo: 'bloqueado@dumbo.cl',
        contrasena: '12345678K',
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(
        { message: 'Account disabled by admin' },
        { status: 403, statusText: 'Forbidden' }
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Usuario deshabilitado');
    });

    it('debe mostrar mensaje de falta de conexión cuando status es 0', async () => {
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

      expect(component.errorMessage()).toBe(
        'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
      );
    });

    it('debe mostrar mensaje de problema del servidor cuando status es 500', async () => {
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

  describe('Validación de formulario, foco y UX', () => {
    it('no debe deshabilitar el botón de submit cuando el formulario es inválido (solo con loading)', async () => {
      await configurarComponente();
      const compiled = fixture.nativeElement as HTMLElement;
      const boton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(component.form.invalid).toBe(true);
      expect(boton.disabled).toBe(false);
    });

    it('no debe llamar al backend si el formulario es inválido, debe mostrar errores y enfocar el primer campo inválido', async () => {
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

    it('debe enfocar el campo contraseña si el correo es válido pero falta la contraseña', async () => {
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

  describe('Mensajes según queryParams', () => {
    it('debe mostrar mensaje de cuenta creada con ?registrado=1', async () => {
      await configurarComponente({ registrado: '1' });
      expect(component.successMessage()).toContain('Cuenta creada');
    });

    it('debe mostrar mensaje de contraseña actualizada con ?contrasenaRestablecida=1', async () => {
      await configurarComponente({ contrasenaRestablecida: '1' });
      expect(component.successMessage()).toContain('Contraseña actualizada correctamente');
    });

    it('debe mostrar "Tu sesión expiró. Inicia sesión nuevamente." con ?sesion=expirada', async () => {
      await configurarComponente({ sesion: 'expirada' });
      expect(component.successMessage()).toBe('Tu sesión expiró. Inicia sesión nuevamente.');
    });
  });
});