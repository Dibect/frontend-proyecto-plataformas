using Microsoft.EntityFrameworkCore;
using Dumbo.API.Data;
using Dumbo.API.Models;

namespace Dumbo.API.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly ApplicationDbContext _context;

    public UsuarioRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Usuario?> ObtenerPorCorreoAsync(string correo)
    {
        return await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == correo);
    }

    public async Task<bool> ExisteRutOCorreoAsync(string rut, string correo)
    {
        return await _context.Usuarios.AnyAsync(u => u.Rut == rut || u.Correo == correo);
    }

    public async Task AgregarAsync(Usuario usuario)
    {
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();
    }
}