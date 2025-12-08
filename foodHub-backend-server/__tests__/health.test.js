const request = require('supertest');
const mongoose = require('mongoose');

let app;

beforeAll(() => {
  // Chỉ lúc này mới require app.js → để server + DB chạy lên
  app = require('../app.js');
});

afterAll(async () => {
  // Bước 1: Giết chết server Express (cách mạnh bạo nhất)
  // Dù không có biến server thì cách này vẫn giết được
  require('http').globalAgent.destroy();

  // Bước 2: Đóng kết nối MongoDB
  await mongoose.connection.close();

  // Bước 3: Đợi tí xíu rồi ép Jest thoát luôn cho chắc ăn
  await new Promise(resolve => setTimeout(resolve, 300));
});

describe('Test API', () => {
  it('GET /greet phải trả về Hello, World!', async () => {
    const res = await request(app).get('/greet');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!');
  });
});