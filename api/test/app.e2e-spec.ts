import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

process.env.DATABASE_URL ??=
  'postgresql://recallhub:Aa123456@localhost:15432/recallhub_db';
process.env.APP_JWT_SECRET ??= 'test_jwt_secret';
process.env.N8N_CALLBACK_SECRET ??= 'test_callback_secret';
process.env.ALLOWED_REPO_ROOTS ??= '/workspace/repos';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'RecallHub API',
          status: 'ok',
        });
      });
  });

  afterEach(async () => {
    await app?.close();
  });
});
