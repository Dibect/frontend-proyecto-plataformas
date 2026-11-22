using Dumbo.API.Data;
using Dumbo.API.DTOs.Reports;
using Dumbo.API.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Controllers;

[ApiController]
[Route("api/reportes")]
// TODO: restringir con [Authorize(Roles = "Trabajador,Administrador")] cuando el JWT esté listo
public class ReportesController : ControllerBase
{
    private const int UmbralStockBajo = 10;
    private readonly ApplicationDbContext _db;

    public ReportesController(ApplicationDbContext db) => _db = db;

    // Rango [ini, fin): "hasta" es inclusivo por día.
    private static (DateTime ini, DateTime fin, string? error) Rango(DateTime? desde, DateTime? hasta)
    {
        var fin = (hasta ?? DateTime.UtcNow).Date;
        var ini = (desde ?? fin.AddDays(-90)).Date;
        if (ini > fin) return (ini, fin, "'desde' debe ser menor o igual que 'hasta'.");
        return (ini, fin.AddDays(1), null);
    }

    [HttpGet("tendencia-ventas")]
    public async Task<ActionResult<List<TendenciaVentasDto>>> TendenciaVentas(
        DateTime? desde, DateTime? hasta, string granularidad = "semana")
    {
        if (granularidad is not ("dia" or "semana" or "mes"))
            return BadRequest("La granularidad debe ser 'dia', 'semana' o 'mes'.");
        var (ini, fin, error) = Rango(desde, hasta);
        if (error is not null) return BadRequest(error);

        // Agregación por día en SQL; luego solo se agrupan esas filas ya resumidas.
        var porDia = await _db.Pedidos.AsNoTracking()
            .Where(p => p.Estado == EstadoPedido.Pagado
                        && p.FechaCreacion >= ini && p.FechaCreacion < fin
                        && p.Total >= 0)
            .GroupBy(p => p.FechaCreacion.Date)
            .Select(g => new { Dia = g.Key, Pedidos = g.Count(), Total = g.Sum(p => p.Total) })
            .ToListAsync();

        var unidadesPorDia = await _db.ItemsPedido.AsNoTracking()
            .Where(i => i.Pedido.Estado == EstadoPedido.Pagado
                        && i.Pedido.FechaCreacion >= ini && i.Pedido.FechaCreacion < fin
                        && i.Cantidad > 0)
            .GroupBy(i => i.Pedido.FechaCreacion.Date)
            .Select(g => new { Dia = g.Key, Unidades = g.Sum(i => i.Cantidad) })
            .ToDictionaryAsync(x => x.Dia, x => x.Unidades);

        string Periodo(DateTime dia) => granularidad switch
        {
            "dia" => dia.ToString("yyyy-MM-dd"),
            "mes" => dia.ToString("yyyy-MM"),
            _ => dia.AddDays(-(((int)dia.DayOfWeek + 6) % 7)).ToString("yyyy-MM-dd") // lunes de la semana
        };

        var resultado = porDia
            .GroupBy(x => Periodo(x.Dia))
            .Select(g => new TendenciaVentasDto(
                g.Key,
                g.Sum(x => x.Pedidos),
                g.Sum(x => unidadesPorDia.GetValueOrDefault(x.Dia)),
                g.Sum(x => x.Total)))
            .OrderBy(x => x.Periodo)
            .ToList();

        return resultado;
    }

    [HttpGet("top-productos")]
    public async Task<ActionResult<List<ProductoMasVendidoDto>>> TopProductos(
        DateTime? desde, DateTime? hasta, int top = 10)
    {
        if (top <= 0) return BadRequest("'top' debe ser mayor que 0.");
        var (ini, fin, error) = Rango(desde, hasta);
        if (error is not null) return BadRequest(error);

        // Se agrupa por nombre normalizado: "Bebida 1.5L" y "bebida 1,5 lts" cuentan como uno.
        var datos = await _db.ItemsPedido.AsNoTracking()
            .Where(i => i.Pedido.Estado == EstadoPedido.Pagado
                        && i.Pedido.FechaCreacion >= ini && i.Pedido.FechaCreacion < fin
                        && i.Cantidad > 0 && i.PrecioUnitario >= 0
                        && i.Producto.NombreNormalizado != "")
            .GroupBy(i => i.Producto.NombreNormalizado)
            .Select(g => new
            {
                Clave = g.Key,
                Nombre = g.Min(i => i.Producto.Nombre),
                Unidades = g.Sum(i => i.Cantidad),
                Ingresos = g.Sum(i => i.Cantidad * i.PrecioUnitario)
            })
            .OrderByDescending(x => x.Unidades).ThenBy(x => x.Clave)
            .Take(top)
            .ToListAsync();

        return datos.Select(x => new ProductoMasVendidoDto(x.Nombre ?? x.Clave, x.Unidades, x.Ingresos)).ToList();
    }

    [HttpGet("stock-por-categoria")]
    public async Task<ActionResult<List<StockPorCategoriaDto>>> StockPorCategoria()
    {
        var datos = await _db.Productos.AsNoTracking()
            .Where(p => p.Stock >= 0)
            .GroupBy(p => p.Categoria == null ? "Sin categoría" : p.Categoria.Nombre)
            .Select(g => new { Categoria = g.Key, Productos = g.Count(), Stock = g.Sum(p => p.Stock) })
            .OrderByDescending(x => x.Stock)
            .ToListAsync();

        return datos.Select(x => new StockPorCategoriaDto(x.Categoria, x.Productos, x.Stock)).ToList();
    }

    [HttpGet("resumen-inventario")]
    public async Task<ActionResult<ResumenInventarioDto>> ResumenInventario()
    {
        var r = await _db.Productos.AsNoTracking()
            .Where(p => p.Stock >= 0)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Productos = g.Count(),
                Unidades = g.Sum(p => p.Stock),
                Bajo = g.Count(p => p.Stock > 0 && p.Stock <= UmbralStockBajo),
                Sin = g.Count(p => p.Stock == 0)
            })
            .FirstOrDefaultAsync();

        return r is null
            ? new ResumenInventarioDto(0, 0, 0, 0)
            : new ResumenInventarioDto(r.Productos, r.Unidades, r.Bajo, r.Sin);
    }
}