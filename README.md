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

Proyecto generado con Angular CLI 21.
