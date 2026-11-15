namespace Dumbo.API.Models;

public class ItemCarrito
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public int ProductoId { get; set; }
    public Producto Producto { get; set; } = null!;
    public int Cantidad { get; set; }
    public DateTime FechaAgregado { get; set; } = DateTime.UtcNow;
}
