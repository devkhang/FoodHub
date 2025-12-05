// __tests__/health.test.js   (đặt trong thư mục __tests__ của backend)

const request = require('supertest');
const app = require('./app.js');   // nếu file chính là index.js hoặc server.js thì đổi thành ../index.js

describe('Health Check - Server khởi động thành công', () => {
  // Test đơn giản nhất: chỉ kiểm tra server có chạy được không
  it('GET / should return status 200-499 (không lỗi 5xx)', async () => {
    const response = await request(app).get('/');

    // Không quan tâm nội dung trả về, chỉ cần server không crash
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });

  // Test thêm một route bất kỳ nếu bạn muốn (tuỳ chọn)
  it('GET /api/health or / should return JSON', async () => {
    const response = await request(app).get('/'); // hoặc /api/health nếu bạn có

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toBeInstanceOf(Object);
  });
});