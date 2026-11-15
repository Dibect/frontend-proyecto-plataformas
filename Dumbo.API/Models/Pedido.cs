using Dumbo.API.Models.Enums;
namespace Dumbo.API.Models;

public class Pedido
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public decimal Total { get; set; }
    public EstadoPedido Estado { get; set; } = EstadoPedido.Pendiente;
    public string? ReferenciaPago { get; set; }
    public ICollection<ItemPedido> Items { get; set; } = new List<ItemPedido>();
}
