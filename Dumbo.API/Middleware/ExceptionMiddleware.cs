using System.Net;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            // Captura global de duplicados en la base de datos (RF-002)
            _logger.LogWarning(ex, "Intento de registro con RUT o Correo duplicado en BD.");
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            
            var result = JsonSerializer.Serialize(new { message = "El RUT o el correo ya está registrado." });
            await context.Response.WriteAsync(result);
        }
        catch (Exception ex)
        {
            // Captura global de cualquier otro error no controlado (Status 500)
            _logger.LogError(ex, "Ocurrió una excepción no controlada en la API.");
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            
            var result = JsonSerializer.Serialize(new { message = "El servidor tuvo un problema. Inténtalo más tarde." });
            await context.Response.WriteAsync(result);
        }
    }
}