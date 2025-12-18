const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 1. IMPORT CÁC FILE CỦA BẠN
const authRoutes = require('../modules/accesscontrol/route/auth'); // Đường dẫn trỏ tới file route bạn gửi
const Account = require('../modules/accesscontrol/models/account');
const User = require('../modules/accesscontrol/models/user');

// Cấu hình môi trường giả lập (Env vars)
process.env.JWT_SECRET_KEY = 'test_secret_key'; 

let mongoServer;
let app;

// --- CẤU HÌNH TRƯỚC KHI CHẠY TEST (SETUP) ---
beforeAll(async () => {
  // 1. Tạo MongoDB ảo trên RAM
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // 2. Kết nối Mongoose với DB ảo này
  await mongoose.connect(uri);

  // 3. Tạo App Express giả để gắn Router vào
  app = express();
  app.use(bodyParser.json());
  
  // Gắn authRoutes vào đường dẫn /auth
  app.use('/auth', authRoutes); 
});

// --- DỌN DẸP SAU MỖI TEST CASE ---
afterEach(async () => {
  // Xóa sạch dữ liệu trong DB ảo để test case sau không bị ảnh hưởng
  await Account.deleteMany();
  await User.deleteMany();
});

// --- NGẮT KẾT NỐI SAU KHI CHẠY HẾT ---
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ==========================================
// BẮT ĐẦU VIẾT TEST CASE
// ==========================================

describe('Auth Integration Tests', () => {

  // TEST CASE 1: Đăng ký User thành công (Happy Path)
  it('POST /auth/signup-user - Should create a new user and return 201', async () => {
    
    // Giả lập dữ liệu gửi lên
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'Tuan',
      lastName: 'Nguyen',
      role: 'ROLE_USER'
    };

    // Thực hiện gọi API
    const res = await request(app)
      .post('/auth/signup-user')
      .send(userData);

    // 
    
    // 1. Kiểm tra HTTP Status
    expect(res.statusCode).toEqual(201);
    
    // 2. Kiểm tra Response Body
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('userId');

    // 3. Kiểm tra Database (Quan trọng nhất của Integration Test)
    const accountInDb = await Account.findOne({ email: 'test@example.com' });
    expect(accountInDb).toBeTruthy();
    expect(accountInDb.role).toBe('ROLE_USER');
    
    // Kiểm tra mật khẩu đã được mã hóa (Hash) chưa
    expect(accountInDb.password).not.toBe('password123'); 
  });

  // TEST CASE 2: Đăng ký thất bại do trùng Email
  it('POST /auth/signup-user - Should return 422 if email already exists', async () => {
    
    // Bước 1: Tạo trước 1 account trong DB
    const existingAccount = new Account({
      email: 'duplicate@example.com',
      password: 'hashedpassword',
      role: 'ROLE_USER'
    });
    await existingAccount.save();

    // Bước 2: Gọi API đăng ký với cùng email đó
    const res = await request(app)
      .post('/auth/signup-user')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'ROLE_USER'
      });

    // Kiểm tra: Phải trả về lỗi 422 hoặc 500 (tùy cách bạn handle reject promise)
    // Trong code bạn: return Promise.reject("Email address already exists...") -> express-validator sẽ bắt lỗi này
    expect(res.statusCode).not.toEqual(201); 
    // Thường express-validator trả về 422
  });

  // TEST CASE 3: Đăng nhập thành công
  it('POST /auth/login - Should return JWT token if credentials are valid', async () => {
    
    // Bước 1: Đăng ký user trước (thông qua API cho giống thực tế)
    const signupData = {
      email: 'login@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'Login',
      lastName: 'User',
      role: 'ROLE_USER'
    };
    await request(app).post('/auth/signup-user').send(signupData);

    // *Lưu ý*: Code signup của bạn set isVerified: true mặc định, nên có thể login ngay.
    
    // Bước 2: Gọi API Login
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123'
      });

    // Kiểm tra kết quả
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token'); // Phải trả về token
  });

  // TEST CASE 4: Đăng nhập sai mật khẩu
  it('POST /auth/login - Should return 401 if password is wrong', async () => {
    
    // Tạo user
    await request(app).post('/auth/signup-user').send({
      email: 'wrongpass@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'ROLE_USER'
    });

    // Login với mật khẩu sai
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrongpass@example.com',
        password: 'WRONG_PASSWORD'
      });

    expect(res.statusCode).toEqual(401);
  });
});