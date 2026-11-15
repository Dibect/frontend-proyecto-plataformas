FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar el archivo del proyecto y restaurar dependencias
COPY ["Dumbo.API.csproj", "./"]
RUN dotnet restore "./Dumbo.API.csproj"

# Copiar el resto del código fuente y compilar
COPY . .
RUN dotnet publish "Dumbo.API.csproj" -c Release -o /app/publish /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# .NET 8 por defecto expone el puerto 8080
EXPOSE 8080

# Traer solo los archivos compilados desde la Etapa 1
COPY --from=build /app/publish .

# Comando para arrancar la API
ENTRYPOINT ["dotnet", "Dumbo.API.dll"]