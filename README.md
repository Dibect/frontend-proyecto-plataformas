# Frontend Proyecto Plataformas (Angular + Docker + GitHub Actions)

Cada `push` a `main` dispara el workflow `.github/workflows/docker-build-push.yml`:

1. **build-and-push**: construye la imagen (Angular → Nginx, `amd64` y `arm64`) y la sube a Docker Hub como `usuario/nombre-del-repo` con los tags `latest` y `sha-xxxxxxx`.
2. **deploy**: entra por SSH a la VM Linux, baja la imagen nueva y reinicia el contenedor.

En un Pull Request solo se construye la imagen (no se sube ni se despliega).

> El nombre de la imagen sale del nombre del repo, así que al copiar este repo para otro proyecto no hay que editar el workflow.

## Configuración (una vez por repositorio)

`Settings → Secrets and variables → Actions`

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub |
| Secret | `DOCKERHUB_TOKEN` | Access Token de Docker Hub (Account settings → Security → New Access Token, permisos *Read & Write*) |
| Secret | `VM_HOST` | IP o dominio de la VM |
| Secret | `VM_USER` | Usuario SSH de la VM |
| Secret | `VM_SSH_KEY` | Clave **privada** SSH completa (con las líneas `BEGIN/END`) |
| Secret | `VM_PORT` | Opcional, por defecto 22 |
| Variable | `DEPLOY_ENABLED` | `true` para activar el job de deploy |
| Variable | `APP_PORT` | Opcional: puerto de la VM donde se publica (por defecto 80) |

Mientras no exista `DEPLOY_ENABLED=true`, el workflow solo construye y sube la imagen.

## Preparar la VM

```bash
# Docker instalado y tu usuario autorizado para usarlo
sudo usermod -aG docker $USER   # cerrar sesión y volver a entrar

# Par de claves solo para el deploy (en tu PC)
ssh-keygen -t ed25519 -f deploy_key -N ""
# deploy_key.pub  → pegar en ~/.ssh/authorized_keys de la VM
# deploy_key      → pegar en el secret VM_SSH_KEY
```

Si la VM está en una red cerrada (VPN o red universitaria) GitHub no podrá llegar por SSH. En ese caso instala un *self-hosted runner* en la VM y cambia `runs-on` del job `deploy` a `self-hosted`.

## Probar en local

```bash
docker build -t frontend .
docker run --rm -p 8080:80 frontend   # http://localhost:8080
```

## Desarrollo

```bash
npm ci
npm start      # http://localhost:4200
```
## Base de datos y reportes

### Modelo de datos
Entity Framework Core 8 con SQL Server 2022. Entidades en `Dumbo.API/Models/`: `Usuario`, `Categoria`, `Producto`, `ItemCarrito`, `Pedido`, `ItemPedido`. El diagrama ER está en `docs/diagramas/modelo-er.md`.

- Los usuarios no se eliminan: se deshabilitan con `Habilitado = false` (RF-007).
- Los pedidos y sus ítems no se borran en cascada, para conservar el historial de ventas. `ItemPedido.PrecioUnitario` guarda el precio al momento de la compra.
- `Producto.NombreNormalizado` guarda una clave canónica del nombre para agrupar en reportes (ver abajo).

### Migraciones
Las migraciones están en `Dumbo.API/Migrations/` y se aplican automáticamente al iniciar la API (con reintentos mientras SQL Server termina de arrancar). Para crear una nueva, desde `Dumbo.API/`:

```
dotnet ef migrations add <Nombre>
dotnet ef database update
```

En `Development` se cargan además datos de prueba (`Data/Seed/DatosDePrueba.cs`): 16 productos, categorías y pedidos pagados de varias semanas.

### Normalización de nombres (RF-008)
`NormalizadorNombreProducto.Normalizar()` pasa a minúsculas, quita tildes, cambia coma decimal por punto y unifica unidades. Así, "Bebida 1.5L", "bebida 1,5 lts" y "BEBIDA 1.5 Litros" se cuentan como un mismo producto (`bebida 1.5 l`).

### Endpoints de reportes (RF-008)
Solo consideran pedidos en estado `Pagado`. Son consultas de solo lectura con agregación en SQL, para no afectar el sistema transaccional.

| Endpoint | Parámetros | Respuesta |
|---|---|---|
| `GET /api/reportes/tendencia-ventas` | `desde`, `hasta`, `granularidad` (`dia`, `semana`, `mes`) | Pedidos, unidades y total vendido por periodo |
| `GET /api/reportes/top-productos` | `desde`, `hasta`, `top` (por defecto 10) | Productos más vendidos, agrupados por nombre normalizado |
| `GET /api/reportes/stock-por-categoria` | ninguno | Productos y stock por categoría ("Sin categoría" incluida) |
| `GET /api/reportes/resumen-inventario` | ninguno | Productos, unidades, stock bajo (1 a 10) y sin stock |

Sin `desde`/`hasta` se usan los últimos 90 días. Parámetros inválidos devuelven `400`. Hoy los reportes no exigen autenticación; falta restringirlos a Trabajador/Administrador cuando el JWT esté integrado.

Proyecto generado con Angular CLI 21.
