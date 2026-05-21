# Docker

Build and run the full MERN stack:

```sh
docker compose up --build
```

Open the app at `http://localhost:5173`.

Services:

- `client`: React app served by Nginx on host port `5173`
- `backend`: Express API on host port `5000`
- `mongo`: MongoDB on host port `27017`

For production, replace the sample `JWT_SECRET` and `MESSAGE_ENCRYPTION_KEY` values in `docker-compose.yml` with strong secrets.

Useful commands:

```sh
docker compose down
docker compose down -v
docker compose logs -f backend
```
