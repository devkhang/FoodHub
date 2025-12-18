const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const express = require("express");


//important mocking
jest.mock("../app.js", () => {
  return {}; // Return an empty object instead of the real app
});

// --- 1. IMPORTS (Assumed available as per request) ---
const Account = require("../modules/accesscontrol/models/account");
const Seller = require("../modules/accesscontrol/models/seller"); 
const User = require("../modules/accesscontrol/models/user"); 
const Item = require("../modules/menu/models/item");
const userController = require("../modules/order/controllers/userController");


// --- 2. APP SETUP FOR INTEGRATION ---
const app = express();
app.use(express.json());
//mock loggedIn user
let mockLoggedInUserId;
app.use((req, res, next) => {
  req.loggedInUserId = mockLoggedInUserId;
  next();
});
//mock real app error handling
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message });
});

// Set Env vars required
process.env.MAX_ITEM_PER_PAGE = "10";
process.env.MAX_RESTAURANT_ACCEPT_RANGE = "20"; // 10 km range

// Mount the specific route to avoid starting a real backend instance
app.get("/restaurants-location/:lat/:lng", userController.getRestaurantsByAddress);
app.post("/cart", userController.postCart);

//TEST SUITE: Ordering
describe("Integration: Get Restaurants By Location", () => {
  let mongoServer;

  // Start In-Memory DB before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Mongoose models (imported above) will automatically attach to this connection
    await mongoose.connect(uri);
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clean data between individual tests
  afterEach(async () => {
    await User.deleteMany();
    await Item.deleteMany();
    await Account.deleteMany();
    await Seller.deleteMany();
  });

  test('Module order thành công tìm được các quán ăn gần với vị trí tìm. Các quán này đều thực sự tồn tại trong database', async () => {
    // --- STEP 1: ARRANGE
    const verifiedAccount = await Account.create({
      email: "test_owner@example.com",
      password: "secure_password_123", // Required by your new schema
      role: "ROLE_SELLER",             // Required enum (Matches context of a restaurant owner)
      isVerified: true,                // Crucial: Controller filters for verified accounts
    });

    const userLat = 10.762622;
    const userLng = 106.660172;

    // Seller is 500m away (Within the range)
    const validSellerData = {
      name: "Cơm Tấm Cali",
      tags: "vietnamese,rice",
      formattedAddress: "123 District 1, HCMC",
      imageUrl: ["http://example.com/image.jpg"],
      address: {
        street: "Nguyen Trai",
        lat: 10.763000, 
        lng: 106.660500, 
        phoneNo: 99999999,
      },
      account: verifiedAccount._id,
      isActive: true,
    };

    // Save to the In-Memory Database
    const createdSeller = await Seller.create(validSellerData);

    // (Optional) Create a faraway seller from the range
    await Seller.create({
      name: "Far Away Bistro",
      tags: "western",
      formattedAddress: "Hanoi",
      imageUrl: ["http://example.com/img2.jpg"],
      address: { lat: 21.028511, lng: 105.854444 },
      account: verifiedAccount._id,
      isActive: true
    });

    // --- STEP 2: ACT
    const response = await request(app)
      .get(`/restaurants-location/${userLat}/${userLng}`)
      .query({ page: 1 });

    // --- STEP 3: ASSERT
    
    // Check API response success
    expect(response.status).toBe(200);
    expect(response.body.restaurants).toHaveLength(1);
    expect(response.body.restaurants[0].name).toBe("Cơm Tấm Cali");

    // Check "Các quán này đều thực sự tồn tại trong database"
    // We take the ID returned by the API and query the DB directly
    const returnedId = response.body.restaurants[0]._id;
    
    // Direct DB query to verify existence
    const sellerInDb = await Seller.findById(returnedId);
    
    expect(sellerInDb).not.toBeNull();
    expect(sellerInDb.name).toEqual(validSellerData.name);
    // Ensure the ID matches what we created in step 1
    expect(sellerInDb._id.toString()).toEqual(createdSeller._id.toString());
  });

  test('Module order trả về kết quả rỗng (hoặc lỗi trang) khi không có quán ăn nào trong phạm vi 20KM', async () => {
    // --- A. ARRANGE (PREPARE DATA) ---

    // 1. Create a Verified Account
    // (Must be verified, otherwise it throws NO_SUITABLE_SELLER before checking distance)
    const verifiedAccount = await Account.create({
      email: "faraway_owner@example.com",
      password: "secure_password",
      role: "ROLE_SELLER",
      isVerified: true, 
    });

    // 2. Define Locations
    // User: Ho Chi Minh City (District 1)
    const userLat = 10.762622;
    const userLng = 106.660172;

    // Seller: Hanoi (Over 1000KM away -> Definitely > 20KM)
    const farLat = 21.028511; 
    const farLng = 105.854444;

    // 3. Create the Seller in DB
    const farSeller = await Seller.create({
      name: "Phở Hà Nội Gốc",
      tags: "pho,hanoi",
      formattedAddress: "Hanoi Capital",
      imageUrl: ["http://img.com/hanoi.jpg"],
      address: {
        street: "Old Quarter",
        lat: farLat,
        lng: farLng,
        phoneNo: 84123456789
      },
      account: verifiedAccount._id,
      isActive: true
    });

    // --- B. ACT (EXECUTE REQUEST) ---
    const response = await request(app)
      .get(`/restaurants-location/${userLat}/${userLng}`)
      .query({ page: 1 });

    // --- C. ASSERT (VERIFY RESULTS) ---

    // 1. Verify that the logic ran and calculated the distance was too far.
    // Based on your code: 
    // - `sellersVerified` is NOT empty (contains Phở Hà Nội).
    // - `sellersFinal` (after distance filter) becomes EMPTY [].
    // - The pagination logic checks `if (skip >= sellersFinal.length)` -> `0 >= 0` -> True.
    // - Throws Error("PAGE_DONT_EXIST").
    
    // We expect the Error Handler to catch this. 
    // Since `err.statusCode` defaults to 500 in your catch block:
    expect(response.status).toBe(500); 
    
    // 2. Verify the specific error message logic
    expect(response.body.message).toBe("PAGE_DONT_EXIST");

    // 3. Database Integrity Check
    // Verify the seller actually exists in DB (it wasn't deleted, just filtered)
    const dbCheck = await Seller.findById(farSeller._id);
    expect(dbCheck).not.toBeNull();
    expect(dbCheck.name).toBe("Phở Hà Nội Gốc");
  });

  test.only('Giỏ hàng rỗng: Database lưu sản phẩm vào giỏ hàng của người dùng thành công', async () => {
    // --- A. ARRANGE (PREPARE DATA) ---

    // 1. Create a Seller (Required to create an Item)
    const seller = await Seller.create({
      name: "Pizza Hut",
      tags: "pizza",
      formattedAddress: "Hanoi",
      imageUrl: ["img.jpg"],
      address: { lat: 10, lng: 10 },
      account: new mongoose.Types.ObjectId(), // Random ID for seller account
      isActive: true
    });

    // 2. Create an Item
    const item = await Item.create({
      title: "Pepperoni Pizza",
      description: "Cheesy",
      imageUrl: "pizza.jpg",
      price: 100,
      creator: seller._id // Link to seller
    });

    // 3. Create User Account
    const account = await Account.create({
      email: "user@test.com",
      password: "hashedpassword",
      role: "ROLE_USER",
      isVerified: true
    });

    // 4. Create User with EMPTY Cart
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      account: account._id,
      cart: { items: [] } // <--- CONTEXT: Giỏ hàng rỗng
    });

    // 5. Mock the Login Session
    mockLoggedInUserId = account._id;

    // --- B. ACT (EXECUTE REQUEST) ---
    const response = await request(app)
      .post("/cart")
      .send({ itemId: item._id });

    // --- C. ASSERT (VERIFY OUTPUT) ---

    // 1. Verify HTTP Response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Item successfully added to cart.");

    // 2. Verify Database State (Expected Output)
    // "Database lưu sản phẩm vào giỏ hàng của người dùng"
    const updatedUser = await User.findById(user._id);

    // Check cart is not empty anymore
    expect(updatedUser.cart.items).toHaveLength(1);
    
    // Check correct Item ID
    expect(updatedUser.cart.items[0].itemId.toString()).toBe(item._id.toString());
    
    // Check Quantity is 1 (Since it was empty before)
    expect(updatedUser.cart.items[0].quantity).toBe(1);
  });


});