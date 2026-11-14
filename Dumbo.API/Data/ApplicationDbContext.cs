using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Seba: Aquí debes agregar los DbSets (Tablas) según el diagrama.
        // Ejemplo para el RF-004 de Productos:
        // public DbSet<Product> Products { get; set; }
        
        // Ejemplo para el RF-003 de Trabajadores:
        // public DbSet<User> Users { get; set; }
    }
}