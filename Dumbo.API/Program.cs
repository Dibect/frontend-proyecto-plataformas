using Dumbo.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 2. Conectar Entity Framework a SQL Server (Sebastián - Base de Datos)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Agregar soporte para Controladores
builder.Services.AddControllers();

var app = builder.Build();

// Habilitar el middleware
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
// Forzar rebuild de GitHub Actions