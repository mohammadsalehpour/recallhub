import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupOpenApi } from '../src/openapi';

process.env.DATABASE_URL ??=
  'postgresql://recallhub:Aa123456@localhost:15432/recallhub_db';
process.env.APP_JWT_SECRET ??= 'test_jwt_secret';
process.env.APP_API_KEY ??= 'test_app_api_key';
process.env.N8N_TRIGGER_SECRET ??= 'test_trigger_secret';
process.env.N8N_CALLBACK_SECRET ??= 'test_callback_secret';
process.env.N8N_CALLBACK_URL ??=
  'http://localhost:3000/api/v1/integrations/n8n/callback';
process.env.N8N_INTERNAL_BASE_URL ??= 'http://localhost:5678/webhook';
process.env.ALLOWED_REPO_ROOTS ??= '/workspace/repos';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupOpenApi(app);
    await app.init();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'RecallHub API',
          status: 'ok',
        });
      });
  });

  it('/api/docs-json (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          openapi: expect.stringMatching(/^3\./),
          info: {
            title: 'RecallHub API',
            version: '1.0',
          },
        });
        expect(body.paths).toHaveProperty('/api/v1/projects');
        expect(body.components.securitySchemes).toHaveProperty('bearer');
        expect(body.components.securitySchemes).toHaveProperty(
          'recallhub-api-key',
        );
      });
  });

  afterEach(async () => {
    await app?.close();
  });
});
