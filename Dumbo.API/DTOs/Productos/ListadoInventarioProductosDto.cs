namespace Dumbo.API.DTOs.Productos;

public sealed record ProductoInventarioDto(
    int Id,
    string Sku,
    string Nombre,
    int? CategoriaId,
    string CategoriaNombre,
    decimal Precio,
    int Stock,
    string? UrlImagen);

public sealed record CategoriaInventarioDto(int Id, string Nombre);

public sealed record ResumenInventarioDto(
    int TotalProductos,
    int UnidadesEnStock,
    int ProductosStockBajo);

public sealed record ListadoInventarioProductosDto(
    IReadOnlyList<ProductoInventarioDto> Productos,
    IReadOnlyList<CategoriaInventarioDto> Categorias,
    ResumenInventarioDto Resumen,
    int Pagina,
    int TamanoPagina,
    int Total);
