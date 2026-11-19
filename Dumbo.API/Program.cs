using Dumbo.API.Data;
using Dumbo.API.Data.Seed;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Configurar CORS (Mauricio - Infraestructura)
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

// --- LÍNEAS NUEVAS: Agregar los servicios de Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
// Aplicar migraciones al arrancar (con reintentos mientras SQL Server termina de iniciar)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    for (var intento = 1; intento <= 10; intento++)
    {
        try { db.Database.Migrate(); break; }
        catch (Exception) when (intento < 10) { Thread.Sleep(3000); }
    }

    // Datos de prueba solo en desarrollo
    if (app.Environment.IsDevelopment())
        await DatosDePrueba.SembrarAsync(db);
}
// --- LÍNEAS NUEVAS: Activar la interfaz gráfica de Swagger ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Habilitar el middleware
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
