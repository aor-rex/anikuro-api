# Download Proxy

Small standalone proxy service for protected AnimePahe CDN download URLs.

## Endpoints

- `GET /health`
- `GET /api/anime/download-proxy?url=<encoded-cdn-url>`

## Env

- `PORT`
- `USER_AGENT`
- `FLARESOLVERR_URL`
- `FLARESOLVERR_SESSION`
- `FLARESOLVERR_MAX_TIMEOUT`
- `CDN_COOKIES`
- `SITE_COOKIES`

Deploy this folder separately on a VPS and point the bot's `DOWNLOAD_PROXY_BASE`
to that deployment base URL.
