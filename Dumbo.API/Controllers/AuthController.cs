using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Dumbo.API.Models;
using Dumbo.API.Models.Enums;
using Dumbo.API.Repositories;
using BCrypt.Net;

namespace Dumbo.API.Controllers;

[ApiController]
[Route("api/autenticacion")]
public class AuthController : ControllerBase
{
    private readonly IUsuarioRepository _usuarioRepository;

    public AuthController(IUsuarioRepository usuarioRepository)
    {
        _usuarioRepository = usuarioRepository;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var usuario = await _usuarioRepository.ObtenerPorCorreoAsync(request.Correo);

        if (usuario == null)
            return Unauthorized(new { message = "Invalid credentials" });

        if (!usuario.Habilitado)
            return StatusCode(403, new { message = "Disabled" });

        var token = "jwt-valido-generado"; // Provisorio
        var fechaExpiracion = DateTime.UtcNow.AddHours(8);

        return Ok(new
        {
            token = token,
            fechaExpiracion = fechaExpiracion,
            usuario = new
            {
                id = usuario.Id,
                correo = usuario.Correo,
                nombreCompleto = $"{usuario.Nombres} {usuario.Apellidos}".Trim(),
                rol = usuario.Rol.ToString()
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegistroRequestDto request)
    {
        // 1. Validaciones manuales
        if (string.IsNullOrWhiteSpace(request.Rut))
            return BadRequest(new { message = "El RUT es obligatorio." });
        if (string.IsNullOrWhiteSpace(request.Nombres) || request.Nombres.Length < 2 || request.Nombres.Length > 60)
            return BadRequest(new { message = "Los nombres deben tener entre 2 y 60 caracteres." });
        if (string.IsNullOrWhiteSpace(request.Apellidos) || request.Apellidos.Length < 2 || request.Apellidos.Length > 60)
            return BadRequest(new { message = "Los apellidos deben tener entre 2 y 60 caracteres." });
        if (string.IsNullOrWhiteSpace(request.Correo) || request.Correo.Length > 150 || !Regex.IsMatch(request.Correo, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return BadRequest(new { message = "El correo no tiene un formato válido." });
        if (string.IsNullOrWhiteSpace(request.Telefono) || !Regex.IsMatch(request.Telefono, @"^\+569\d{8}$"))
            return BadRequest(new { message = "El teléfono debe ser un celular chileno válido (+569XXXXXXXX)." });

        var rutLimpio = request.Rut.Replace(".", "").Replace("-", "").ToUpper();
        if (rutLimpio.Length < 8 || rutLimpio.Length > 9)
            return BadRequest(new { message = "El RUT es inválido." });

        var cuerpoRut = rutLimpio[..^1];
        var dvRut = rutLimpio[^1..];
        if (!EsRutValido(cuerpoRut, dvRut))
            return BadRequest(new { message = "El RUT es inválido o el dígito verificador es incorrecto." });

        // 2. Normalización
        var rutNormalizado = $"{cuerpoRut}-{dvRut}";
        var correoNormalizado = request.Correo.Trim().ToLower();
        var contrasenaInicial = rutLimpio; 

        // 3. Verificación previa de duplicados
        var existe = await _usuarioRepository.ExisteRutOCorreoAsync(rutNormalizado, correoNormalizado);
        if (existe)
        {
            return Conflict(new { message = "El RUT o el correo ya está registrado." });
        }

        // 4. Creación y guardado
        var nuevoUsuario = new Usuario
        {
            Rut = rutNormalizado,
            Nombres = request.Nombres.Trim(),
            Apellidos = request.Apellidos.Trim(),
            Telefono = request.Telefono,
            Correo = correoNormalizado,
            HashContrasena = BCrypt.Net.BCrypt.HashPassword(contrasenaInicial),
            Rol = RolUsuario.Cliente,
            Habilitado = true,
            FechaCreacion = DateTime.UtcNow
        };

        // Si hay concurrencia exacta y falla el índice único en SQL, 
        // el ExceptionMiddleware atrapará el error silenciosamente y retornará 409.
        await _usuarioRepository.AgregarAsync(nuevoUsuario);

        return StatusCode(201, new { id = nuevoUsuario.Id, correo = nuevoUsuario.Correo });
    }

    private bool EsRutValido(string cuerpo, string dvEsperado)
    {
        int suma = 0;
        int multiplicador = 2;
        for (int i = cuerpo.Length - 1; i >= 0; i--)
        {
            if (!int.TryParse(cuerpo[i].ToString(), out int digito)) return false;
            suma += digito * multiplicador;
            multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
        }

        int dvCalculado = 11 - (suma % 11);
        string dvReal = dvCalculado == 11 ? "0" : dvCalculado == 10 ? "K" : dvCalculado.ToString();
        return dvEsperado == dvReal;
    }
}

public class LoginRequestDto
{
    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
}

public class RegistroRequestDto
{
    public string Rut { get; set; } = string.Empty;
    public string Nombres { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
}