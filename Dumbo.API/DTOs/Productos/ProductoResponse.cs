namespace Dumbo.API.DTOs.Productos;

public sealed record ProductoResponse(
    int Id,
    string Sku,
    string Nombre,
    string Descripcion,
    decimal Precio,
    int Stock,
    string? UrlImagen,
    string? Presentacion,
    decimal? PrecioAnterior,
    int? CategoriaId,
    DateTime FechaCreacion);
