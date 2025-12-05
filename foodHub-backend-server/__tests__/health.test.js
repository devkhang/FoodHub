// __tests__/health.test.js   (đặt trong thư mục __tests__ của backend)

const request = require('supertest');
const app = require('../app.js');   // nếu file chính là index.js hoặc server.js thì đổi thành ../index.js

describe('GET /greet', () => {
  it('should respond with "Hello, World!"', async () => {
    const res = await request(app).get('/greet');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe('Hello, World!');
  });
});