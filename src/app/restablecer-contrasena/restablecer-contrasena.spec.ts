import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RestablecerContrasena } from './restablecer-contrasena';
import { API_URL } from '../core/api.config';
import { MENSAJE_PASSWORD_INSEGURA } from '../core/validators/password.validators';

describe('RestablecerContrasena', () => {
  let component: RestablecerContrasena;
  let fixture: ComponentFixture<RestablecerContrasena>;
  let httpMock: HttpTestingController;
  let router: Router;

  const configurarConToken = async (token: string | null) => {
    await TestBed.configureTestingModule({
      imports: [RestablecerContrasena],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(token ? { token } : {}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestablecerContrasena);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  };

  afterEach(() => {
    httpMock.verify();
  });

  it('debe mostrar aviso y ocultar el formulario cuando falta el token en la URL', async () => {
    await configurarConToken(null);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.token()).toBeNull();
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'El enlace de recuperación no es válido'
    );
    expect(compiled.querySelector('a[href="/recuperar-contrasena"]')).toBeTruthy();
  });

  it('debe mantener el botón habilitado con form inválido y mostrar el mensaje exacto del ERS al enviar contraseña insegura', async () => {
    await configurarConToken('token-valido-123');

    const compiled = fixture.nativeElement as HTMLElement;
    const boton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);

    component.form.patchValue({
      nuevaContrasena: 'corta',
      confirmarContrasena: 'corta',
    });

    component.onSubmit();
    fixture.detectChanges();

    httpMock.expectNone(`${API_URL}/restablecer-contrasena`);
    expect(compiled.textContent).toContain(MENSAJE_PASSWORD_INSEGURA);
  });

  it('debe restablecer la contraseña y redirigir a /login?contrasenaRestablecida=1 en el flujo feliz', async () => {
    await configurarConToken('token-valido-123');
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.form.patchValue({
      nuevaContrasena: 'Abcdefgh1',
      confirmarContrasena: 'Abcdefgh1',
    });

    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/restablecer-contrasena`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      token: 'token-valido-123',
      nuevaContrasena: 'Abcdefgh1',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await fixture.whenStable();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { contrasenaRestablecida: '1' },
    });
  });

  it('debe mostrar mensaje claro y enlace para pedir otro correo cuando el backend responde 400', async () => {
    await configurarConToken('token-expirado');

    component.form.patchValue({
      nuevaContrasena: 'Abcdefgh1',
      confirmarContrasena: 'Abcdefgh1',
    });

    component.onSubmit();

    const req = httpMock.expectOne(`${API_URL}/restablecer-contrasena`);
    req.flush(null, { status: 400, statusText: 'Bad Request' });

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.errorMessage()).toContain('inválido o ha expirado');
    expect(compiled.querySelector('.alert-link a[href="/recuperar-contrasena"]')).toBeTruthy();
  });
});