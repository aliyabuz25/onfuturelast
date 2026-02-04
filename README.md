# OnFutureV3

OnFuture Agency – Xaricdə təhsil, viza dəstəyi və peşəkar proqramlaşdırma kursları mərkəzi.

## Deployment with Traefik

This project is configured to be deployed using Docker and Traefik.

### Prerequisites
- Docker & Docker Compose
- Traefik running on an external network named `edge`

### Local Setup
```bash
node server.js
```
The server will be available at `http://localhost:6985`.

### Docker Deployment
```bash
docker compose up -d --build
```

### CI/CD Guidelines
- Ensure `logs.json` is mapped to a persistent volume.
- Update `traefik.http.routers.onfuture-web.rule` label if domain changes.
