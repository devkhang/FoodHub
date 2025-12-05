// __tests__/health.test.js
const request = require('supertest');

let app;

beforeAll(async () => {
  // Chỉ require app SAU KHI GitHub đã inject biến thật
  app = (await import('../app.js')).default || require('../app.js');
});

it('server không crash', async () => {
  const res = await request(app).get('/');
  expect(res.status).toBeLessThan(500);
});