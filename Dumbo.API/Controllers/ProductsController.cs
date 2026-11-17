using Dumbo.API.Data;
using Dumbo.API.DTOs.Productos;
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

    public ProductsController(ApplicationDbContext context)
    {
        _context = context;
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

        if (sku.Length == 0 || nombre.Length == 0)
        {
            ModelState.AddModelError(nameof(request.Sku), "El SKU y el nombre son obligatorios.");
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

        var producto = new Producto
        {
            Sku = sku,
            Nombre = nombre,
            NombreNormalizado = NormalizarNombre(nombre),
            Descripcion = request.Descripcion.Trim(),
            Precio = request.Precio,
            Stock = request.Stock,
            UrlImagen = NormalizarOpcional(request.UrlImagen),
            Presentacion = NormalizarOpcional(request.Presentacion),
            PrecioAnterior = request.PrecioAnterior,
            CategoriaId = request.CategoriaId
        };

        _context.Productos.Add(producto);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new ProductoResponse(
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

        return StatusCode(StatusCodes.Status201Created, response);
    }

    private static string NormalizarNombre(string nombre) =>
        string.Join(" ", nombre.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .ToLowerInvariant();

    private static string? NormalizarOpcional(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
