# ---------- STAGE 1: Build ----------
# $BUILDPLATFORM: el build de Angular corre en la arquitectura nativa del runner
# (amd64) aunque la imagen final sea también para arm64. Evita emular con QEMU
# el npm ci + ng build, que es lentísimo. El resultado (HTML/JS/CSS) no depende
# de la arquitectura.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Sin nombre de proyecto: angular.json tiene uno solo, y así el Dockerfile
# no se rompe si el proyecto se llama distinto (los nombres distinguen mayúsculas).
RUN npx ng build --configuration production

# ---------- STAGE 2: Runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf

# dist/<nombre-del-proyecto>/browser  (el comodín evita depender del nombre)
COPY --from=build /app/dist/*/browser /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1 y no "localhost": en Alpine localhost resuelve primero a IPv6 (::1)
# y nginx escucha solo IPv4, así que el contenedor aparecería "unhealthy".
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
