using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Dumbo.API.Helpers;

public static class NormalizadorNombreProducto
{
    private static readonly Dictionary<string, string> Unidades = new()
    {
        ["l"] = "l", ["lt"] = "l", ["lts"] = "l", ["litro"] = "l", ["litros"] = "l",
        ["ml"] = "ml", ["cc"] = "ml",
        ["kg"] = "kg", ["kgs"] = "kg", ["kilo"] = "kg", ["kilos"] = "kg",
        ["g"] = "g", ["gr"] = "g", ["grs"] = "g", ["gramo"] = "g", ["gramos"] = "g",
        ["un"] = "un", ["und"] = "un", ["unidad"] = "un", ["unidades"] = "un"
    };

    private static readonly Regex Numero = new(@"^\d+(\.\d+)?$", RegexOptions.Compiled);

    // Devuelve "" si el nombre es nulo o vacío: ese producto queda fuera de los reportes.
    public static string Normalizar(string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return string.Empty;

        // Quitar tildes y pasar a minúsculas
        var descompuesto = nombre.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in descompuesto)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        var texto = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();

        // Coma decimal -> punto (solo entre dígitos)
        texto = Regex.Replace(texto, @"(?<=\d),(?=\d)", ".");

        // Separar número y unidad pegados: "1.5l" -> "1.5 l"
        texto = Regex.Replace(texto, @"(\d)([a-z])", "$1 $2");

        // Colapsar espacios
        texto = Regex.Replace(texto.Trim(), @"\s+", " ");

        // Unificar unidades que van después de un número
        var tokens = texto.Split(' ');
        for (var i = 1; i < tokens.Length; i++)
        {
            if (Numero.IsMatch(tokens[i - 1]) && Unidades.TryGetValue(tokens[i], out var unidad))
                tokens[i] = unidad;
        }

        return string.Join(' ', tokens);
    }
}