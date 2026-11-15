using Dumbo.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Usuario> Usuarios => Set<Usuario>();
        public DbSet<Categoria> Categorias => Set<Categoria>();
        public DbSet<Producto> Productos => Set<Producto>();
        public DbSet<ItemCarrito> ItemsCarrito => Set<ItemCarrito>();
        public DbSet<Pedido> Pedidos => Set<Pedido>();
        public DbSet<ItemPedido> ItemsPedido => Set<ItemPedido>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Usuario>(e =>
            {
                e.Property(x => x.Rut).HasMaxLength(12).IsRequired();
                e.Property(x => x.Nombres).HasMaxLength(100).IsRequired();
                e.Property(x => x.Apellidos).HasMaxLength(100).IsRequired();
                e.Property(x => x.Telefono).HasMaxLength(20).IsRequired();
                e.Property(x => x.Correo).HasMaxLength(150).IsRequired();
                e.Property(x => x.HashContrasena).HasMaxLength(256).IsRequired();
                e.Property(x => x.Rol).HasConversion<string>().HasMaxLength(20);
                e.HasIndex(x => x.Rut).IsUnique();
                e.HasIndex(x => x.Correo).IsUnique();
            });

            modelBuilder.Entity<Categoria>(e =>
            {
                e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
                e.HasIndex(x => x.Nombre).IsUnique();
            });

            modelBuilder.Entity<Producto>(e =>
            {
                e.Property(x => x.Sku).HasMaxLength(50).IsRequired();
                e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
                e.Property(x => x.NombreNormalizado).HasMaxLength(200).IsRequired();
                e.Property(x => x.Descripcion).HasMaxLength(1000);
                e.Property(x => x.UrlImagen).HasMaxLength(500);
                e.Property(x => x.Presentacion).HasMaxLength(50);
                e.Property(x => x.Precio).HasPrecision(18, 2);
                e.Property(x => x.PrecioAnterior).HasPrecision(18, 2);
                e.ToTable(t => t.HasCheckConstraint("CK_Productos_Stock", "[Stock] >= 0"));
                e.HasIndex(x => x.Sku).IsUnique();
                e.HasIndex(x => x.NombreNormalizado);
                e.HasIndex(x => x.CategoriaId);
                e.HasOne(x => x.Categoria)
                    .WithMany(c => c.Productos)
                    .HasForeignKey(x => x.CategoriaId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<ItemCarrito>(e =>
            {
                e.HasIndex(x => new { x.UsuarioId, x.ProductoId }).IsUnique();
                e.HasOne(x => x.Usuario)
                    .WithMany(u => u.ItemsCarrito)
                    .HasForeignKey(x => x.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Producto)
                    .WithMany(p => p.ItemsCarrito)
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Pedido>(e =>
            {
                e.Property(x => x.Total).HasPrecision(18, 2);
                e.Property(x => x.Estado).HasConversion<string>().HasMaxLength(20);
                e.Property(x => x.ReferenciaPago).HasMaxLength(100);
                e.HasIndex(x => x.FechaCreacion);
                e.HasOne(x => x.Usuario)
                    .WithMany(u => u.Pedidos)
                    .HasForeignKey(x => x.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ItemPedido>(e =>
            {
                e.Property(x => x.PrecioUnitario).HasPrecision(18, 2);
                e.HasIndex(x => x.ProductoId);
                e.HasOne(x => x.Pedido)
                    .WithMany(p => p.Items)
                    .HasForeignKey(x => x.PedidoId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Producto)
                    .WithMany(p => p.ItemsPedido)
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict); 
            });
        }
    }
}