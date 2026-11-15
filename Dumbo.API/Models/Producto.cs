namespace Dumbo.API.Models;

public class Producto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string NombreNormalizado { get; set; } = string.Empty; // clave para RF-008
    public string Descripcion { get; set; } = string.Empty;
    public decimal Precio { get; set; }
    public int Stock { get; set; }
    public string? UrlImagen { get; set; }
    public string? Presentacion { get; set; }     // mockup: "1 un", "2 kg"
    public decimal? PrecioAnterior { get; set; }  // mockup: precio tachado
    public int? CategoriaId { get; set; }         // nullable: RF-008 tolera sin categoría
    public Categoria? Categoria { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public ICollection<ItemCarrito> ItemsCarrito { get; set; } = new List<ItemCarrito>();
    public ICollection<ItemPedido> ItemsPedido { get; set; } = new List<ItemPedido>();
}
