# RecallHub

RecallHub is a control plane for project memory and AI-assisted development workflows.

## Local Start

```bash
cp .env.example .env
cp api/.env.example api/.env
docker compose -f infra/docker-compose.yml up -d postgres redis
cd api
npm install
npm run prisma:generate
npm run db:apply:local
npm run start:dev
```

API health:

```http
GET http://localhost:3000/api/v1
```

The local Postgres password is `Aa123456` as configured for this development environment.
Postgres is exposed on host port `15432` to avoid colliding with an existing local Postgres on `5432`.

Note: Prisma 7.8 currently validates and generates SQL for this multi-schema setup, but `migrate dev`/`db push` returned a generic schema engine error in this local run. The checked-in initial migration SQL was generated with `prisma migrate diff` and applied through `psql` for now.
