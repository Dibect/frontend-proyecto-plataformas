using Dumbo.API.Data;
using Dumbo.API.Data.Seed;
using Dumbo.API.Repositories;
using Dumbo.API.Middleware;
using Dumbo.API.Services.Productos;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<ImportadorCsvProductos>();

builder.Services.AddControllers();
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

    // Datos de prueba de productos y pedidos solo en desarrollo
    if (app.Environment.IsDevelopment())
        await DatosDePrueba.SembrarAsync(db);
}

app.UseMiddleware<ExceptionMiddleware>();

// --- SE EJECUTA EL SEEDER / MIGRACIONES ---
app.SeedDatabase();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();