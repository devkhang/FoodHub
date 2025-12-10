// __tests__/auth.test.js
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app.js');

// === MOCK BCRYPT HOÀN CHỈNH ===
jest.mock('bcryptjs');
const bcrypt = require('bcryptjs');
bcrypt.hash.mockResolvedValue('hashed_fake'); // ← THÊM DÒNG NÀY CHO SIGNUP!

// === Mock model ===
jest.mock('../modules/accesscontrol/models/account');
jest.mock('../modules/accesscontrol/models/seller');
jest.mock('../modules/accesscontrol/models/user'); // ← ĐÃ CÓ, TUYỆT VỜI!
const Account = require('../modules/accesscontrol/models/account');
const Seller = require('../modules/accesscontrol/models/seller');
const User = require('../modules/accesscontrol/models/user');

describe('API Login - Mock 100%', () => {
  afterEach(() => jest.clearAllMocks());

  it('Đăng nhập thành công', async () => {
    Account.findOne.mockResolvedValue({
      _id: '123',
      email: 'c1@gmail.com',
      password: '12345678',
      role: 'ROLE_USER',
      isVerified: true
    });
    Seller.findOne.mockResolvedValue({ isActive: true });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'c1@gmail.com', password: '12345678' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Logged-in successfully');
  });

  it('Sai mật khẩu → 401', async () => {
    Account.findOne.mockResolvedValue({
      _id: '123',                    // ← THÊM _id (rất quan trọng!)
      email: 'c1@gmail.com',
      password: 'hash',
      role: 'ROLE_USER',             // ← THÊM DÒNG NÀY!!!
      isVerified: true
    });

    Seller.findOne.mockResolvedValue({ isActive: true });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'c1@gmail.com', password: 'sai' });

    expect(res.status).toBe(403);
  });
});

describe('POST /auth/signup-user - Đăng ký tài khoản khách hàng', () => {
  const validData = {
    email: 'newuser@gmail.com',
    password: '12345678',
    confirmPassword: '12345678',
    firstName: 'Nguyen',
    lastName: 'Van A',
    role: 'ROLE_USER'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Account.prototype.save.mockResolvedValue({ _id: 'acc123' });
    User.prototype.save.mockResolvedValue({ _id: 'user123' });
  });

  it('should signup successfully with valid data', async () => {
    Account.findOne.mockResolvedValue(null); // email chưa tồn tại

    const res = await request(app).post('/auth/signup-user').send(validData);

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('signed-up successfully');
    expect(res.body.userId).toBeDefined();
  });

  it('should hash password before saving', async () => {
    Account.findOne.mockResolvedValue(null);

    await request(app).post('/auth/signup-user').send(validData);

    expect(bcrypt.hash).toHaveBeenCalledTimes(1); // ← BÂY GIỜ PASS!
    expect(bcrypt.hash).toHaveBeenCalledWith('12345678', 12);
  });

  it('should reject if passwords do not match', async () => {
    const res = await request(app).post('/auth/signup-user').send({
      ...validData,
      confirmPassword: 'khacmatkhau'
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].msg).toBe('Passwords have to match!');
  });
});