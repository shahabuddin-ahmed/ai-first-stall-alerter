# StallAlert backend (`apps/backend`)

Node.js + TypeScript + Express API with MySQL 8 (Sequelize). It started from my own Express/MySQL boilerplate
(baseline commit `e90ed03`). Everything after that commit is quest work.

## Run with Docker (API + MySQL + phpMyAdmin)

```bash
cd apps/backend
cp .env.example .env        # optional: change ports or passwords
yarn install
docker compose up
```

- API: http://localhost:4000/api/v1 (health: `/api/v1/health`)
- phpMyAdmin: http://localhost:8080
- MySQL: localhost:3306, database `stallalert` (utf8mb4)

## Run the API locally (MySQL in Docker)

```bash
docker compose up db -d
yarn dev
```

## Tests

```bash
yarn test         # all
yarn test-unit    # unit only
yarn test-integ   # integration only
```

Local development only. The credentials in `docker-compose.yml` and `.env.example` are placeholders for fictional data.
