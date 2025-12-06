const request = require('supertest');
const app = require('../app.js'); // Import Express app
const mongoose = require('mongoose'); // Import Mongoose để đóng kết nối

describe('API FoodHub – Test thật nhưng vẫn không cần DB thật', () => {
    
    // ⭐️ HOOK QUAN TRỌNG: Đóng kết nối Mongoose sau khi tất cả các test hoàn tất.
    // Việc này giải phóng handle mở của DB và cho phép Jest thoát.
    afterAll(async () => {
        // Kiểm tra trạng thái kết nối Mongoose trước khi đóng
        if (mongoose.connection.readyState !== 0) {
            console.log("-> Đóng kết nối Mongoose sau khi kiểm thử...");
            await mongoose.disconnect();
        }
        
        // Vì server được khởi tạo bên trong .then() của mongoose.connect, 
        // Jest sẽ tự động xử lý server handle sau khi mongoose bị đóng.
    });

    it('should respond with "Hello, World!"', async () => {
        const res = await request(app).get('/greet');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('Hello, World!');
    });

    it('POST /auth/login đúng mật khẩu', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: 'c1@gmail.com', password: '12345678' });
          
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Logged-in successfully');
    },10000); // 10s timeout cho test liên quan đến DB
});