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
    private readonly ApplicationDbContext _context;
    private readonly ImportadorCsvProductos _importador;

    public ProductsController(ApplicationDbContext context, ImportadorCsvProductos importador)
    {
        _context = context;
        _importador = importador;
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