using System.ComponentModel.DataAnnotations;

namespace Dumbo.API.DTOs.Productos;

public sealed class CrearProductoRequest
{
    [Required]
    [StringLength(50)]
    public string Sku { get; init; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Nombre { get; init; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Descripcion { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal Precio { get; init; }

    [Range(0, int.MaxValue)]
    public int Stock { get; init; }

    [StringLength(500)]
    public string? UrlImagen { get; init; }

    [StringLength(50)]
    public string? Presentacion { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal? PrecioAnterior { get; init; }

    [Range(1, int.MaxValue)]
    public int? CategoriaId { get; init; }
}
