using Dumbo.API.Models;
using Dumbo.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Data;

public static class DatabaseSeeder
{
    // Método de extensión para WebApplication
    public static void SeedDatabase(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var env = app.Environment;

        var maxRetries = 10;
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                // 1. Aplicar migraciones
                context.Database.Migrate();

                // 2. Insertar datos de prueba (solo en Development)
                if (env.IsDevelopment())
                {
                    SeedAdministrador(context);
                }
                
                break;
            }
            catch (Exception)
            {
                if (i == maxRetries - 1) throw;
                Thread.Sleep(3000);
            }
        }
    }

    private static void SeedAdministrador(ApplicationDbContext context)
    {
        if (!context.Usuarios.Any(u => u.Rol == RolUsuario.Administrador))
        {
            context.Usuarios.Add(new Usuario
            {
                Rut = "11111111-1",
                Nombres = "Administrador",
                Apellidos = "Sistema",
                Correo = "admin@dumbo.cl",
                Telefono = "+56900000000",
                HashContrasena = BCrypt.Net.BCrypt.HashPassword("111111111"),
                Rol = RolUsuario.Administrador,
                Habilitado = true
            });
            
            context.SaveChanges();
        }
    }
}