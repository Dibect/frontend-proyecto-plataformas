using Dumbo.API.Data;
using Dumbo.API.DTOs.Productos;
using Dumbo.API.Services.Productos;
using Dumbo.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize(Roles = "Trabajador")]
public sealed class ProductsController : ControllerBase
{
    private const int UmbralStockBajo = 10;
    private readonly ApplicationDbContext _context;
    private readonly ImportadorCsvProductos _importador;

    public ProductsController(ApplicationDbContext context, ImportadorCsvProductos importador)
    {
        _context = context;
        _importador = importador;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListadoInventarioProductosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ListadoInventarioProductosDto>> Listar(
        CancellationToken cancellationToken,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanoPagina = 5,
        [FromQuery] string? busqueda = null,
        [FromQuery] int? categoriaId = null,
        [FromQuery] string estado = "todos")
    {
        pagina = Math.Max(1, pagina);
        tamanoPagina = Math.Clamp(tamanoPagina, 1, 50);

        var productosBase = _context.Productos.AsNoTracking();
        var resumen = new ResumenInventarioDto(
            await productosBase.CountAsync(cancellationToken),
            await productosBase.SumAsync(p => (int?)p.Stock, cancellationToken) ?? 0,
            await productosBase.CountAsync(
                p => p.Stock > 0 && p.Stock <= UmbralStockBajo,
                cancellationToken));

        var consulta = productosBase.AsQueryable();
        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            var termino = busqueda.Trim();
            consulta = consulta.Where(p => p.Nombre.Contains(termino) || p.Sku.Contains(termino));
        }
        if (categoriaId is int idCategoria)
        {
            consulta = consulta.Where(p => p.CategoriaId == idCategoria);
        }

        switch (estado.Trim().ToLowerInvariant())
        {
            case "todos":
                break;
            case "disponible":
                consulta = consulta.Where(p => p.Stock > UmbralStockBajo);
                break;
            case "stock-bajo":
                consulta = consulta.Where(p => p.Stock > 0 && p.Stock <= UmbralStockBajo);
                break;
            case "sin-stock":
                consulta = consulta.Where(p => p.Stock == 0);
                break;
            default:
                return BadRequest(new ProblemDetails
                {
                    Title = "Estado inválido",
                    Detail = "Usa todos, disponible, stock-bajo o sin-stock."
                });
        }

        var total = await consulta.CountAsync(cancellationToken);
        var productos = await consulta
            .OrderBy(p => p.Nombre)
            .ThenBy(p => p.Sku)
            .Skip((pagina - 1) * tamanoPagina)
            .Take(tamanoPagina)
            .Select(p => new ProductoInventarioDto(
                p.Id,
                p.Sku,
                p.Nombre,
                p.CategoriaId,
                p.Categoria == null ? "Sin categoría" : p.Categoria.Nombre,
                p.Precio,
                p.Stock,
                p.UrlImagen))
            .ToListAsync(cancellationToken);

        var categorias = await _context.Categorias.AsNoTracking()
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaInventarioDto(c.Id, c.Nombre))
            .ToListAsync(cancellationToken);

        return Ok(new ListadoInventarioProductosDto(
            productos,
            categorias,
            resumen,
            pagina,
            tamanoPagina,
            total));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProductoResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductoResponse>> Crear(
        [FromBody] CrearProductoRequest request,
        CancellationToken cancellationToken)
    {
        var sku = request.Sku.Trim();
        var nombre = request.Nombre.Trim();

        if (string.IsNullOrWhiteSpace(sku))
        {
            ModelState.AddModelError(nameof(request.Sku), "El SKU es obligatorio.");
        }
        if (string.IsNullOrWhiteSpace(nombre))
        {
            ModelState.AddModelError(nameof(request.Nombre), "El nombre es obligatorio.");
        }
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (await _context.Productos.AnyAsync(p => p.Sku == sku, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "SKU duplicado",
                Detail = "Ya existe un producto con ese SKU."
            });
        }

        if (request.CategoriaId is int categoriaId &&
            !await _context.Categorias.AnyAsync(c => c.Id == categoriaId, cancellationToken))
        {
            ModelState.AddModelError(nameof(request.CategoriaId), "La categoría indicada no existe.");
            return ValidationProblem(ModelState);
        }

        var producto = ProductoFactory.Desde(request);
        _context.Productos.Add(producto);
        await _context.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, CrearRespuesta(producto));
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    [ProducesResponseType(typeof(ResultadoImportacionProductosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ResultadoImportacionProductosDto>> ImportarCsv(
        [FromForm] IFormFile? archivo,
        CancellationToken cancellationToken)
    {
        if (archivo is null || archivo.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Archivo requerido",
                Detail = "Selecciona un archivo CSV no vacío."
            });
        }

        if (!string.Equals(Path.GetExtension(archivo.FileName), ".csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Formato no admitido",
                Detail = "La importación acepta archivos .csv."
            });
        }

        try
        {
            await using var stream = archivo.OpenReadStream();
            var resultado = await _importador.ImportarAsync(stream, cancellationToken);
            return Ok(resultado);
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "CSV inválido",
                Detail = exception.Message
            });
        }
    }

    private static ProductoResponse CrearRespuesta(Producto producto) => new(
        producto.Id,
        producto.Sku,
        producto.Nombre,
        producto.Descripcion,
        producto.Precio,
        producto.Stock,
        producto.UrlImagen,
        producto.Presentacion,
        producto.PrecioAnterior,
        producto.CategoriaId,
        producto.FechaCreacion);
}
