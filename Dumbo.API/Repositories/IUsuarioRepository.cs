using Dumbo.API.Models;

namespace Dumbo.API.Repositories;

public interface IUsuarioRepository
{
    Task<Usuario?> ObtenerPorCorreoAsync(string correo);
    Task<bool> ExisteRutOCorreoAsync(string rut, string correo);
    Task AgregarAsync(Usuario usuario);
}