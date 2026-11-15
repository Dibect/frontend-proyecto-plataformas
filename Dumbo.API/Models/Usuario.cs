using Dumbo.API.Models.Enums;
namespace Dumbo.API.Models;

public class Usuario
{
    public int Id { get; set; }
    public string Rut { get; set; } = string.Empty;
    public string Nombres { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string HashContrasena { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; } = RolUsuario.Cliente;
    public bool Habilitado { get; set; } = true; // RF-007: no se eliminan, se deshabilitan
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public ICollection<ItemCarrito> ItemsCarrito { get; set; } = new List<ItemCarrito>();
    public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
}
