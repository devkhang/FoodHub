const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 1. IMPORT ROUTES VÀ MODELS
const itemRoutes = require('../modules/menu/route/item'); 
const Account = require('../models/account'); // Đường dẫn tới model của bạn
const Seller = require('../models/seller');   // Đường dẫn tới model của bạn
const Item = require('../models/item');       // Đường dẫn tới model của bạn

// 2. MOCK (GIẢ LẬP) CÁC MIDDLEWARE
// Vì ta không muốn test lại logic login, ta sẽ bypass auth.verifySeller
const mockAuthMiddleware = (req, res, next) => {
  // Giả định user đã login và có ID này
  req.loggedInUserId = global.mockAccountId; 
  next();
};

// Mock việc upload file (vì controller check req.file)
const mockUploadMiddleware = (req, res, next) => {
  // Tự tạo object file giả
  req.file = {
    path: 'images/test-image.jpg', // Đường dẫn giả
    filename: 'test-image.jpg'
  };
  next();
};

// Mock fs (File System) để không xóa file thật khi chạy hàm deleteItem
const fs = require('fs');
jest.spyOn(fs, 'unlink').mockImplementation((path, callback) => {
  callback(null); // Giả vờ xóa thành công
});

let mongoServer;
let app;
let sellerId;
let accountId;

// --- SETUP TRƯỚC TẤT CẢ TEST ---
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(bodyParser.json());

  // QUAN TRỌNG: Gắn Mock Middleware TRƯỚC Routes
  // Lưu ý: route của bạn dùng auth.verifySeller bên trong, 
  // nên để bypass, ta cần sửa cách mount route hoặc mock function auth.verifySeller.
  // Cách đơn giản nhất cho Integration test là mock module auth:
});

// --- SETUP TRƯỚC MỖI TEST CASE (TẠO DỮ LIỆU NỀN) ---
beforeEach(async () => {
  // 1. Tạo Account giả
  const account = new Account({
    email: 'seller@test.com',
    password: 'hashed',
    role: 'ROLE_SELLER'
  });
  const savedAccount = await account.save();
  accountId = savedAccount._id;
  global.mockAccountId = accountId; // Gán ID cho mockAuthMiddleware dùng

  // 2. Tạo Seller giả liên kết với Account
  const seller = new Seller({
    name: 'Test Restaurant',
    account: savedAccount._id,
    items: [],
    // ... thêm các field bắt buộc khác của model Seller nếu có (tags, address...)
    tags: 'Test', 
    formattedAddress: '123 Test St',
    imageUrl: ['test.jpg']
  });
  const savedSeller = await seller.save();
  sellerId = savedSeller._id;

  // 3. Khởi tạo App mới cho mỗi lần test để sạch sẽ
  // Ở đây ta dùng kỹ thuật: Đè middleware auth của route bằng mock
  
  // Mẹo: Để test route có auth.verifySeller, ta có thể dùng jest.mock hoặc 
  // chỉ cần gán req.loggedInUserId ở middleware toàn cục nếu route dùng biến đó.
  
  app = express();
  app.use(bodyParser.json());
  
  // Middleware giả lập Auth và File Upload cho mọi request
  app.use((req, res, next) => {
    req.loggedInUserId = accountId;
    req.file = { path: 'images/mock.jpg' }; // Luôn có file để pass validation
    next();
  });

  app.use('/item', itemRoutes);
});

afterEach(async () => {
  await Account.deleteMany();
  await Seller.deleteMany();
  await Item.deleteMany();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ==========================================
// TEST CASES
// ==========================================

describe('Item Integration Tests', () => {

  // TEST 1: Tạo món ăn mới
  it('POST /item/create-item - Should create item and link to seller', async () => {
    const itemData = {
      title: 'Banh Mi',
      description: 'Delicious Vietnamese Sandwich',
      price: 25000,
      tags: 'Food'
    };

    const res = await request(app)
      .post('/item/create-item')
      .send(itemData);

    // 1. Check Response
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Item created, hurray!');
    expect(res.body.item.title).toEqual('Banh Mi');

    // 2. Check Database: Item được tạo chưa?
    const createdItem = await Item.findOne({ title: 'Banh Mi' });
    expect(createdItem).toBeTruthy();
    expect(createdItem.creator.toString()).toEqual(sellerId.toString());

    // 3. Check Database: Seller có được update mảng items không?
    const updatedSeller = await Seller.findById(sellerId);
    expect(updatedSeller.items).toContainEqual(createdItem._id);
  });

  // TEST 2: Xóa món ăn
  it('DELETE /item/delete-item/:id - Should delete item and remove from seller', async () => {
    // Tạo sẵn 1 item trong DB
    const item = new Item({
      title: 'Pho',
      description: 'Noodle soup',
      price: 50000,
      imageUrl: 'images/pho.jpg',
      creator: sellerId
    });
    const savedItem = await item.save();

    // Push item vào seller (giả lập trạng thái trước khi xóa)
    await Seller.findByIdAndUpdate(sellerId, { $push: { items: savedItem._id } });

    // Gọi API xóa
    const res = await request(app)
      .delete(`/item/delete-item/${savedItem._id}`);

    // Check Response
    expect(res.statusCode).toBe(200);

    // Check DB: Item mất chưa?
    const deletedItem = await Item.findById(savedItem._id);
    expect(deletedItem).toBeNull();

    // Check DB: Seller array mất ID chưa?
    const seller = await Seller.findById(sellerId);
    expect(seller.items).not.toContainEqual(savedItem._id);
  });

  // TEST 3: Validation lỗi
  it('POST /item/create-item - Should fail if title is too short', async () => {
    const res = await request(app)
      .post('/item/create-item')
      .send({
        title: 'Ab', // Quá ngắn (< 4)
        description: 'Test',
        price: 100
      });

    expect(res.statusCode).toBe(422); // Validation Failed
  });
});