namespace Dumbo.API.DTOs.Productos;

public sealed record ErrorFilaImportacionDto(int Fila, string Mensaje);

public sealed record ResultadoImportacionProductosDto(
    int FilasLeidas,
    int ProductosImportados,
    int FilasRechazadas,
    IReadOnlyList<ErrorFilaImportacionDto> Errores);
