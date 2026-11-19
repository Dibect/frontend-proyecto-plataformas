namespace Dumbo.API.DTOs.Reports;

public record TendenciaVentasDto(string Periodo, int Pedidos, int UnidadesVendidas, decimal TotalVentas);
public record ProductoMasVendidoDto(string Nombre, int UnidadesVendidas, decimal Ingresos);
public record StockPorCategoriaDto(string Categoria, int Productos, int StockTotal);
public record ResumenInventarioDto(int ProductosActivos, int UnidadesTotales, int ProductosStockBajo, int ProductosSinStock);