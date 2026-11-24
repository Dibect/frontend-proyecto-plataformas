using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text;
using Dumbo.API.Data;
using Dumbo.API.DTOs.Productos;
using Dumbo.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dumbo.API.Services.Productos;

public sealed class ImportadorCsvProductos
{
    private const int MaxFileBytes = 5 * 1024 * 1024;
    private const int MaxSkuQuerySize = 1000;
    private readonly ApplicationDbContext _context;

    public ImportadorCsvProductos(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResultadoImportacionProductosDto> ImportarAsync(
        Stream archivo,
        CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(archivo, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
        var contenido = await reader.ReadToEndAsync(cancellationToken);
        if (Encoding.UTF8.GetByteCount(contenido) > MaxFileBytes)
        {
            throw new InvalidDataException("El archivo CSV supera el límite de 5 MB.");
        }

        if (string.IsNullOrWhiteSpace(contenido))
        {
            throw new InvalidDataException("El archivo CSV está vacío.");
        }

        var separador = DetectarSeparador(contenido);
        var registros = ParsearCsv(contenido, separador);
        if (registros.Count == 0)
        {
            throw new InvalidDataException("El archivo CSV no contiene encabezados.");
        }

        var indices = ObtenerIndices(registros[0]);
        var filas = new List<(int Numero, CrearProductoRequest? Request, string? Error)>();

        for (var i = 1; i < registros.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var valores = registros[i];
            if (valores.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var numeroFila = i + 1;
            if (valores.Count != registros[0].Count)
            {
                filas.Add((numeroFila, null, $"Se esperaban {registros[0].Count} columnas y se encontraron {valores.Count}."));
                continue;
            }

            var errorLectura = CrearRequest(valores, indices, out var request);
            if (errorLectura is not null)
            {
                filas.Add((numeroFila, null, errorLectura));
                continue;
            }

            var validaciones = new List<ValidationResult>();
            var contexto = new ValidationContext(request!);
            if (!Validator.TryValidateObject(request!, contexto, validaciones, validateAllProperties: true))
            {
                filas.Add((numeroFila, null, string.Join(" ", validaciones.Select(v => v.ErrorMessage))));
                continue;
            }

            if (string.IsNullOrWhiteSpace(request!.Sku) || string.IsNullOrWhiteSpace(request.Nombre))
            {
                filas.Add((numeroFila, null, "SKU y nombre son obligatorios."));
                continue;
            }

            filas.Add((numeroFila, request, null));
        }

        var candidatas = filas.Where(f => f.Request is not null).ToList();
        var skusExistentes = await BuscarSkusExistentesAsync(
            candidatas.Select(f => f.Request!.Sku.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            cancellationToken);
        var categoriasExistentes = await BuscarCategoriasAsync(
            candidatas.Where(f => f.Request!.CategoriaId.HasValue)
                .Select(f => f.Request!.CategoriaId!.Value)
                .Distinct()
                .ToList(),
            cancellationToken);

        var skusArchivo = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var errores = filas.Where(f => f.Error is not null)
            .Select(f => new ErrorFilaImportacionDto(f.Numero, f.Error!))
            .ToList();
        var productos = new List<Producto>();

        foreach (var fila in candidatas)
        {
            var request = fila.Request!;
            var sku = request.Sku.Trim();

            if (skusExistentes.Contains(sku))
            {
                errores.Add(new ErrorFilaImportacionDto(fila.Numero, $"El SKU '{sku}' ya existe."));
                continue;
            }

            if (skusArchivo.Contains(sku))
            {
                errores.Add(new ErrorFilaImportacionDto(fila.Numero, $"El SKU '{sku}' está repetido en el archivo."));
                continue;
            }

            if (request.CategoriaId is int categoriaId && !categoriasExistentes.Contains(categoriaId))
            {
                errores.Add(new ErrorFilaImportacionDto(fila.Numero, $"La categoría {categoriaId} no existe."));
                continue;
            }

            skusArchivo.Add(sku);
            productos.Add(ProductoFactory.Desde(request));
        }

        if (productos.Count > 0)
        {
            _context.Productos.AddRange(productos);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new ResultadoImportacionProductosDto(
            FilasLeidas: registros.Count - 1,
            ProductosImportados: productos.Count,
            FilasRechazadas: errores.Count,
            Errores: errores.OrderBy(e => e.Fila).ToList());
    }

    private static string? CrearRequest(
        IReadOnlyList<string> valores,
        IReadOnlyDictionary<string, int> indices,
        out CrearProductoRequest? request)
    {
        request = null;
        var precioTexto = Leer(valores, indices, "precio");
        if (!TryParseDecimal(precioTexto, out var precio))
        {
            return "Precio inválido; usa números sin separador de miles y punto o coma decimal.";
        }

        var stockTexto = Leer(valores, indices, "stock");
        if (!int.TryParse(stockTexto, NumberStyles.Integer, CultureInfo.InvariantCulture, out var stock))
        {
            return "Stock inválido; debe ser un número entero.";
        }

        decimal? precioAnterior = null;
        var precioAnteriorTexto = Leer(valores, indices, "precioanterior");
        if (!string.IsNullOrWhiteSpace(precioAnteriorTexto))
        {
            if (!TryParseDecimal(precioAnteriorTexto, out var valorAnterior))
            {
                return "PrecioAnterior inválido.";
            }
            precioAnterior = valorAnterior;
        }

        int? categoriaId = null;
        var categoriaTexto = Leer(valores, indices, "categoriaid");
        if (!string.IsNullOrWhiteSpace(categoriaTexto))
        {
            if (!int.TryParse(categoriaTexto, NumberStyles.Integer, CultureInfo.InvariantCulture, out var valorCategoria))
            {
                return "CategoriaId inválido; debe ser un número entero.";
            }
            categoriaId = valorCategoria;
        }

        request = new CrearProductoRequest
        {
            Sku = Leer(valores, indices, "sku").Trim(),
            Nombre = Leer(valores, indices, "nombre").Trim(),
            Descripcion = Leer(valores, indices, "descripcion").Trim(),
            Precio = precio,
            Stock = stock,
            UrlImagen = LeerOpcional(valores, indices, "urlimagen"),
            Presentacion = LeerOpcional(valores, indices, "presentacion"),
            PrecioAnterior = precioAnterior,
            CategoriaId = categoriaId
        };

        return null;
    }

    private static Dictionary<string, int> ObtenerIndices(IReadOnlyList<string> encabezados)
    {
        var indices = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < encabezados.Count; i++)
        {
            var clave = NormalizarEncabezado(encabezados[i]);
            if (clave.Length == 0)
            {
                continue;
            }

            if (!indices.TryAdd(clave, i))
            {
                throw new InvalidDataException($"El encabezado '{encabezados[i]}' está repetido.");
            }
        }

        var requeridos = new[] { "sku", "nombre", "descripcion", "precio", "stock" };
        var faltantes = requeridos.Where(r => !indices.ContainsKey(r)).ToList();
        if (faltantes.Count > 0)
        {
            throw new InvalidDataException($"Faltan columnas obligatorias: {string.Join(", ", faltantes)}.");
        }

        return indices;
    }

    private static string NormalizarEncabezado(string valor)
    {
        var normalizado = valor.Trim().Normalize(NormalizationForm.FormD);
        var resultado = new StringBuilder(normalizado.Length);
        foreach (var caracter in normalizado)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }
            if (char.IsLetterOrDigit(caracter))
            {
                resultado.Append(char.ToLowerInvariant(caracter));
            }
        }
        return resultado.ToString();
    }

    private static string Leer(IReadOnlyList<string> valores, IReadOnlyDictionary<string, int> indices, string clave) =>
        valores[indices[clave]].Trim();

    private static string? LeerOpcional(
        IReadOnlyList<string> valores,
        IReadOnlyDictionary<string, int> indices,
        string clave) =>
        indices.TryGetValue(clave, out var indice) && !string.IsNullOrWhiteSpace(valores[indice])
            ? valores[indice].Trim()
            : null;

    private static bool TryParseDecimal(string valor, out decimal resultado)
    {
        resultado = default;
        var texto = valor.Trim().Replace(" ", string.Empty);
        if (texto.Length == 0)
        {
            return false;
        }

        var ultimaComa = texto.LastIndexOf(',');
        var ultimoPunto = texto.LastIndexOf('.');
        if (ultimaComa >= 0 && ultimoPunto >= 0)
        {
            var separadorDecimal = ultimaComa > ultimoPunto ? ',' : '.';
            var separadorMiles = separadorDecimal == ',' ? '.' : ',';
            texto = texto.Replace(separadorMiles.ToString(), string.Empty);
            if (separadorDecimal == ',')
            {
                texto = texto.Replace(',', '.');
            }
        }
        else if (ultimaComa >= 0)
        {
            texto = texto.Replace(',', '.');
        }

        return decimal.TryParse(
            texto,
            NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture,
            out resultado);
    }

    private async Task<HashSet<string>> BuscarSkusExistentesAsync(
        IReadOnlyList<string> skus,
        CancellationToken cancellationToken)
    {
        var existentes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var bloque in skus.Chunk(MaxSkuQuerySize))
        {
            var encontrados = await _context.Productos.AsNoTracking()
                .Where(p => bloque.Contains(p.Sku))
                .Select(p => p.Sku)
                .ToListAsync(cancellationToken);
            existentes.UnionWith(encontrados);
        }
        return existentes;
    }

    private async Task<HashSet<int>> BuscarCategoriasAsync(
        IReadOnlyList<int> ids,
        CancellationToken cancellationToken)
    {
        var existentes = new HashSet<int>();
        foreach (var bloque in ids.Chunk(MaxSkuQuerySize))
        {
            var encontrados = await _context.Categorias.AsNoTracking()
                .Where(c => bloque.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);
            existentes.UnionWith(encontrados);
        }
        return existentes;
    }

    private static char DetectarSeparador(string contenido)
    {
        var comas = 0;
        var puntosYComas = 0;
        var entreComillas = false;

        for (var i = 0; i < contenido.Length; i++)
        {
            var caracter = contenido[i];
            if (caracter == '"')
            {
                if (entreComillas && i + 1 < contenido.Length && contenido[i + 1] == '"')
                {
                    i++;
                    continue;
                }
                entreComillas = !entreComillas;
                continue;
            }
            if (!entreComillas && (caracter == '\r' || caracter == '\n'))
            {
                break;
            }
            if (!entreComillas && caracter == ',') comas++;
            if (!entreComillas && caracter == ';') puntosYComas++;
        }

        return puntosYComas > comas ? ';' : ',';
    }

    private static List<List<string>> ParsearCsv(string contenido, char separador)
    {
        var registros = new List<List<string>>();
        var registro = new List<string>();
        var campo = new StringBuilder();
        var entreComillas = false;
        var inicioCampo = true;

        for (var i = 0; i < contenido.Length; i++)
        {
            var caracter = contenido[i];
            if (entreComillas)
            {
                if (caracter == '"')
                {
                    if (i + 1 < contenido.Length && contenido[i + 1] == '"')
                    {
                        campo.Append('"');
                        i++;
                    }
                    else
                    {
                        entreComillas = false;
                    }
                }
                else
                {
                    campo.Append(caracter);
                }
                continue;
            }

            if (caracter == '"' && inicioCampo)
            {
                entreComillas = true;
                inicioCampo = false;
            }
            else if (caracter == separador)
            {
                registro.Add(campo.ToString());
                campo.Clear();
                inicioCampo = true;
            }
            else if (caracter == '\r' || caracter == '\n')
            {
                registro.Add(campo.ToString());
                campo.Clear();
                if (registro.Any(v => v.Length > 0))
                {
                    registros.Add(registro);
                }
                registro = new List<string>();
                inicioCampo = true;
                if (caracter == '\r' && i + 1 < contenido.Length && contenido[i + 1] == '\n') i++;
            }
            else
            {
                if (caracter == '"')
                {
                    throw new InvalidDataException("El CSV contiene comillas en una posición inválida.");
                }
                campo.Append(caracter);
                if (!char.IsWhiteSpace(caracter)) inicioCampo = false;
            }
        }

        if (entreComillas)
        {
            throw new InvalidDataException("El CSV contiene un campo entre comillas sin cerrar.");
        }

        if (campo.Length > 0 || registro.Count > 0)
        {
            registro.Add(campo.ToString());
            if (registro.Any(v => v.Length > 0)) registros.Add(registro);
        }

        return registros;
    }
}


