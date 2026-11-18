using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dumbo.API.Data;
using Dumbo.API.Models;
using Dumbo.API.Models.Enums;

namespace Dumbo.API.Controllers;

[ApiController]
[Route("api/autenticacion")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AuthController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        // 1. Buscar usuario por correo en la base de datos
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Correo == request.Correo);

        if (usuario == null)
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }


    
        if (!usuario.Habilitado)
        {
            return StatusCode(403, new { message = "Disabled" });
        }

        var token = "jwt-valido-generado"; // Reemplaza con tu servicio de tokens JWT real
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
                rol = usuario.Rol.ToString() // Convierte el enum RolUsuario a string (Ej: "Cliente", "Administrador", etc.)
            }
        });
    }
}

// DTO para la petición de inicio de sesión
public class LoginRequestDto
{
    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
}