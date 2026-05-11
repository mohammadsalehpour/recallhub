# RecallHub

RecallHub is a control plane for project memory and AI-assisted development workflows.

## Angular Control Plane

The Angular UI lives in `web/` and is the RecallHub control-plane frontend. It talks to the NestJS API only:

- Project setup wizard
- Project memory tables
- Work item lifecycle controls with status-aware gating
- Workflow run monitor
- Stability dashboard with admin confirmation
- Audit timeline

Run locally:

```bash
cd web
npm install
npm start
```

Then open:

```http
http://localhost:4200
```

Run with Docker:

```bash
docker compose -f infra/docker-compose.yml up -d --build web
```

## Local Start

```bash
cp .env.example .env
cp api/.env.example api/.env
docker compose -f infra/docker-compose.yml up -d postgres redis
cd api
npm install
npm run prisma:generate
npm run db:apply:local
cd ..
docker compose -f infra/docker-compose.yml up -d --build api web n8n
bash n8n/scripts/import-and-publish-stubs.sh
```

Local n8n starts with `N8N_LLM_MODE=contract_stub` so the signed
`NestJS -> n8n -> callback -> Artifact` path is testable without provider
credentials. For real LLM execution, set these before importing/publishing the
workflows:

```bash
N8N_LLM_MODE=openai
N8N_LLM_MODEL=<official OpenAI model id>
OPENAI_API_KEY=<your key>
```

The workflow code intentionally fails with `MISSING_LLM_MODEL` or
`MISSING_LLM_API_KEY` when real LLM mode is selected without explicit provider
configuration.

API health:

```http
GET http://localhost:3000/api/v1
```

n8n UI:

```http
GET http://localhost:5678
```

Angular UI:

```http
GET http://localhost:4200
```

The local Angular token can be set to `APP_API_KEY` from `.env` for API-key mode.

For host-local API development instead of the Docker API container, stop `api` and run:

```bash
cd api
npm run start:dev
```


Privilege regression check (after DB migrations):

```bash
cd api
npm run test:n8n-privileges
```

The local Postgres password is `Aa123456` as configured for this development environment.
Postgres is exposed on host port `15432` to avoid colliding with an existing local Postgres on `5432`.

Note: Prisma 7.8 currently validates and generates SQL for this multi-schema setup, but `migrate dev`/`db push` returned a generic schema engine error in this local run. The checked-in initial migration SQL was generated with `prisma migrate diff` and applied through `psql` for now.

## Next tracks (non-NestJS)

- `n8n/`: artifact-only n8n workflows with signed callbacks and optional real LLM execution.
- `web/`: Angular 21 + Tailwind control plane.
