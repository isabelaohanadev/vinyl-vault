# syntax=docker/dockerfile:1

# The interface is plain HTML, CSS and JavaScript: there is nothing to build.
FROM nginx:1.29-alpine

# Where /api is proxied to. The nginx image fills ${API_UPSTREAM} in at start-up.
ENV API_UPSTREAM=http://backend:3000

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

COPY index.html /usr/share/nginx/html/index.html
COPY config.js /usr/share/nginx/html/config.js
COPY scripts /usr/share/nginx/html/scripts
COPY styles /usr/share/nginx/html/styles
COPY assets /usr/share/nginx/html/assets
COPY vendor /usr/share/nginx/html/vendor

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
