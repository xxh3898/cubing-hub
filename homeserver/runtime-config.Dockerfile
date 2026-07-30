FROM scratch

ARG REVISION

LABEL org.opencontainers.image.source="https://github.com/xxh3898/cubing-hub"
LABEL org.opencontainers.image.revision="${REVISION}"
LABEL io.chochiho.runtime-config.project="cubing-hub"

COPY homeserver/docker-compose.yml /runtime/compose.yaml
COPY homeserver/nginx/cloudflare-edge-real-ip.conf /runtime/nginx/cloudflare-edge-real-ip.conf
COPY --chmod=0700 homeserver/scripts/deploy-home-server.sh /runtime/scripts/deploy-cubing-hub.sh
COPY --chmod=0700 homeserver/scripts/backup-home-server.sh /runtime/scripts/backup-cubing-hub.sh

CMD ["/runtime/compose.yaml"]
