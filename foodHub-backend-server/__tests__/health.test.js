// __tests__/health.test.js   (đặt trong thư mục __tests__ của backend)

const request = require('supertest');
const app = require('../app.js');   // nếu file chính là index.js hoặc server.js thì đổi thành ../index.js

describe('API FoodHub – Test thật nhưng vẫn không cần DB thật', () => {
  it('should respond with "Hello, World!"', async () => {
    const res = await request(app).get('/greet');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe('Hello, World!');
  });
  it('POST /auth/login sai mật khẩu → trả về 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'c1@gmail.com', password: '12345678' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Logged-in successfully');
  });
});