using Dumbo.API.Helpers;
using Dumbo.API.Models;
using Dumbo.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Data.Seed;

public static class DatosDePrueba
{
    public static async Task SembrarAsync(ApplicationDbContext db)
    {
        if (await db.Productos.AnyAsync()) return; // ya hay datos

        var bebidas = new Categoria { Nombre = "Bebidas" };
        var frutas = new Categoria { Nombre = "Frutas y verduras" };
        var lacteos = new Categoria { Nombre = "Lácteos" };
        var despensa = new Categoria { Nombre = "Despensa" };
        db.Categorias.AddRange(bebidas, frutas, lacteos, despensa);

        Producto P(string sku, string nombre, decimal precio, int stock, Categoria? cat) => new()
        {
            Sku = sku,
            Nombre = nombre,
            NombreNormalizado = NormalizadorNombreProducto.Normalizar(nombre),
            Descripcion = nombre,
            Precio = precio,
            Stock = stock,
            Categoria = cat
        };

        var productos = new List<Producto>
        {
            P("BEB-001", "Bebida 1.5L", 1800, 40, bebidas),
            P("BEB-002", "bebida 1,5 lts", 1750, 25, bebidas),   // variante del anterior
            P("BEB-003", "Agua mineral 500 ml", 900, 8, bebidas),
            P("BEB-004", "Jugo de naranja 1 L", 1500, 0, bebidas),
            P("FRU-001", "Manzana roja 1 kg", 1990, 60, frutas),
            P("FRU-002", "manzana roja 1 kilo", 1950, 12, frutas), // variante
            P("FRU-003", "Plátano 1 kg", 1490, 35, frutas),
            P("FRU-004", "Tomate 1 kg", 2200, 9, frutas),
            P("LAC-001", "Leche entera 1 L", 1200, 80, lacteos),
            P("LAC-002", "Yogurt natural 150 g", 450, 50, lacteos),
            P("LAC-003", "Queso gauda 250 gr", 2900, 15, lacteos),
            P("DES-001", "Arroz grado 1 1 kg", 1600, 70, despensa),
            P("DES-002", "Fideos spaghetti 400 g", 1100, 90, despensa),
            P("DES-003", "Aceite vegetal 900 ml", 2800, 20, despensa),
            P("DES-004", "Azúcar 1 kg", 1300, 6, despensa),
            P("VAR-001", "Pilas AA x4", 3500, 30, null)           // sin categoría
        };
        db.Productos.AddRange(productos);

        // Cliente de prueba (hash de relleno; NO es una contraseña válida)
        var cliente = new Usuario
        {
            Rut = "11111111-1",
            Nombres = "Cliente",
            Apellidos = "De Prueba",
            Telefono = "+56900000000",
            Correo = "cliente.prueba@dumbo.cl",
            HashContrasena = "SIN_CONTRASENA_SEMILLA",
            Rol = RolUsuario.Cliente
        };
        db.Usuarios.Add(cliente);
        await db.SaveChangesAsync();

        // Pedidos pagados en las últimas 8 semanas, más uno pendiente y uno fallido
        var rnd = new Random(42);
        var hoy = DateTime.UtcNow.Date;
        for (var semana = 0; semana < 8; semana++)
        {
            var pedidosEnSemana = 3 + semana; // tendencia creciente
            for (var n = 0; n < pedidosEnSemana; n++)
            {
                var pedido = new Pedido
                {
                    Usuario = cliente,
                    FechaCreacion = hoy.AddDays(-7 * (7 - semana) - rnd.Next(0, 7)),
                    Estado = EstadoPedido.Pagado,
                    ReferenciaPago = $"SIM-{semana}-{n}"
                };
                foreach (var prod in productos.OrderBy(_ => rnd.Next()).Take(rnd.Next(1, 4)))
                {
                    var cantidad = rnd.Next(1, 5);
                    pedido.Items.Add(new ItemPedido { Producto = prod, Cantidad = cantidad, PrecioUnitario = prod.Precio });
                }
                pedido.Total = pedido.Items.Sum(i => i.Cantidad * i.PrecioUnitario);
                db.Pedidos.Add(pedido);
            }
        }

        foreach (var estado in new[] { EstadoPedido.Pendiente, EstadoPedido.Fallido })
        {
            var prod = productos[0];
            var pedido = new Pedido { Usuario = cliente, Estado = estado, Total = prod.Precio };
            pedido.Items.Add(new ItemPedido { Producto = prod, Cantidad = 1, PrecioUnitario = prod.Precio });
            db.Pedidos.Add(pedido);
        }

        await db.SaveChangesAsync();
    }
}