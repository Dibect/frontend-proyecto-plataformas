using Dumbo.API.DTOs.Productos;
using Dumbo.API.Models;

namespace Dumbo.API.Services.Productos;

public static class ProductoFactory
{
    public static Producto Desde(CrearProductoRequest request)
    {
        var nombre = request.Nombre.Trim();

        return new Producto
        {
            Sku = request.Sku.Trim(),
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
    }

    private static string NormalizarNombre(string nombre) =>
        string.Join(" ", nombre.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .ToLowerInvariant();

    private static string? NormalizarOpcional(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
