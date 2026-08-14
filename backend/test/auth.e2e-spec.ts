import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Auth RBAC (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /products sin token retorna 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/products')
      .send({ sku: 'X', name: 'Test', cost_price: 1, sale_price: 2 })
      .expect(401);
  });

  it('GET /users sin token retorna 401', () => {
    return request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('GET /settings/store es público', () => {
    return request(app.getHttpServer())
      .get('/api/v1/settings/store')
      .expect(200)
      .expect((res) => {
        expect(res.body.tax_rate).toBeDefined();
      });
  });
});
