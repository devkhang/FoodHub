const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const express = require("express");
const jwt = require("jsonwebtoken");


//important mocking
jest.mock("../app.js", () => {
  return {}; // Return an empty object instead of the real app
});

// --- 1. IMPORTS (Assumed available as per request) ---
const Account = require("../modules/accesscontrol/models/account");
const Seller = require("../modules/accesscontrol/models/seller"); 
const User = require("../modules/accesscontrol/models/user"); 
const Item = require("../modules/menu/models/item");
const Order = require("../modules/order/models/order");
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
// Mock Socket.io to prevent "io.getIO is not a function" error
jest.mock("../util/socket.js", () => ({
  getIO: () => ({
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  }),
}));
// Mock Stripe (Pass-through for this test since we aren't testing 'Completed')
jest.mock("stripe", () => {
  return jest.fn(() => ({
    transfers: { create: jest.fn() },
  }));
});

// Set Env vars required
process.env.MAX_ITEM_PER_PAGE = "10";
process.env.MAX_RESTAURANT_ACCEPT_RANGE = "20"; // 10 km range
process.env.JWT_SECRET_KEY = "test_secret_key"; //for jwt authentication, authorization

// Mount the specific route to avoid starting a real backend instance
app.get("/restaurants-location/:lat/:lng", userController.getRestaurantsByAddress);
app.post("/cart", userController.postCart);
app.get("/cart", userController.getCart);
app.post("/remove-cart-item/:itemId", userController.postCartRemove);
app.post("/delete-cart-item", userController.postCartDelete);
app.post("/order-status/:orderId", userController.postOrderStatus);


//TEST SUITE: Ordering
describe("Ordering business process", () => {
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

  test('[BD2DB_INT_001]:Module order thành công tìm được các quán ăn gần với vị trí tìm. Các quán này đều thực sự tồn tại trong database', async () => {
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

  test('[BD2DB_INT_002]:Module order trả về kết quả rỗng (hoặc lỗi trang) khi không có quán ăn nào trong phạm vi 20KM', async () => {
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

  test('[BD2DB_INT_003]:Giỏ hàng rỗng: Database lưu sản phẩm vào giỏ hàng của người dùng thành công', async () => {
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

  test('[BD2DB_INT_004]:Module order từ chối lưu, trả về lỗi MIX_CART khi giỏ hàng có món từ quán khác', async () => {
    // --- STEP 1: ARRANGE (Setup Data) ---

    // 1. Create TWO different Sellers
    const sellerA = await Seller.create({
      name: "Burger King",
      tags: "burger",
      formattedAddress: "Location A",
      imageUrl: ["a.jpg"],
      address: { lat: 10, lng: 10 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    const sellerB = await Seller.create({
      name: "McDonalds", // Different Seller
      tags: "burger",
      formattedAddress: "Location B",
      imageUrl: ["b.jpg"],
      address: { lat: 20, lng: 20 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    // 2. Create TWO Items (One from each Seller)
    const itemFromSellerA = await Item.create({
      title: "Whopper",
      description: "Big Burger",
      imageUrl: "whopper.jpg",
      price: 50,
      creator: sellerA._id 
    });

    const itemFromSellerB = await Item.create({
      title: "Big Mac",
      description: "Double Burger",
      imageUrl: "bigmac.jpg",
      price: 50,
      creator: sellerB._id // Different Creator
    });

    // 3. Create User Account
    const account = await Account.create({
      email: "mixcart@test.com",
      password: "password",
      role: "ROLE_USER",
      isVerified: true
    });
    mockLoggedInUserId = account._id; // Set session

    // 4. Create User with Context: "Giỏ hàng có món từ quán khác"
    // We pre-fill the cart with Item A
    const user = await User.create({
      firstName: "Test",
      lastName: "Mix",
      account: account._id,
      cart: {
        items: [
          {
            itemId: itemFromSellerA._id,
            quantity: 1
          }
        ]
      }
    });

    // --- STEP 2: ACT (Execute Request) ---
    // Attempt to add Item B (from Seller B) to the cart containing Item A
    const response = await request(app)
      .post("/cart")
      .send({ itemId: itemFromSellerB._id });

    // --- STEP 3: ASSERT (Verify Results) ---

    // 1. Verify Error Response
    // The logic throws Error("MIX_CART"). Since no statusCode is set on that error object, 
    // it defaults to 500 in the error handler.
    expect(response.status).toBe(500); 
    console.log("===============================","response.body")
    expect(response.body.message).toBe("MIX_CART");

    // 2. Verify Database Integrity (Crucial)
    // Ensure the item was NOT added to the database
    const userInDb = await User.findById(user._id);
    
    // Cart length should still be 1 (only the original item)
    expect(userInDb.cart.items).toHaveLength(1);
    
    // The item in cart should still be Item A
    expect(userInDb.cart.items[0].itemId.toString()).toBe(itemFromSellerA._id.toString());
  });

  test('[BD2DB_INT_005]:Module order thành công trả về các sản phẩm có trong giỏ hàng và tổng tiền chính xác', async () => {
    // --- STEP 1: ARRANGE (Setup Data) ---

    // 1. Create a Seller (Needed for Items)
    const seller = await Seller.create({
      name: "Tech Store",
      tags: "tech",
      formattedAddress: "Tech Street",
      imageUrl: ["img.jpg"],
      address: { lat: 10, lng: 10 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    // 2. Create Items with specific prices for calculation test
    // Item A: Price $100
    const itemA = await Item.create({
      title: "Gaming Mouse",
      description: "Fast",
      imageUrl: "mouse.jpg",
      price: 100, 
      creator: seller._id
    });

    // Item B: Price $50
    const itemB = await Item.create({
      title: "Keyboard",
      description: "Mechanical",
      imageUrl: "kb.jpg",
      price: 50,
      creator: seller._id
    });

    // 3. Create User Account
    const account = await Account.create({
      email: "shopper@test.com",
      password: "123",
      role: "ROLE_USER",
      isVerified: true
    });
    mockLoggedInUserId = account._id; // Log in

    // 4. Create User with specific Cart configuration
    // Scenario: 
    // - 2 units of Item A (2 * 100 = 200)
    // - 1 unit of Item B (1 * 50 = 50)
    // Expected Total: 250
    await User.create({
      firstName: "John",
      lastName: "Doe",
      account: account._id,
      cart: {
        items: [
          { itemId: itemA._id, quantity: 2 },
          { itemId: itemB._id, quantity: 1 }
        ]
      }
    });

    // --- STEP 2: ACT (Execute Request) ---
    const response = await request(app).get("/cart");

    // --- STEP 3: ASSERT (Verify Results) ---

    // 1. Status Check
    expect(response.status).toBe(200);

    // 2. Verify Response Structure
    const { cart, totalPrice } = response.body;
    expect(cart).toBeDefined();
    expect(cart).toHaveLength(2);

    // 3. Verify Logic: Total Price Calculation
    // (100 * 2) + (50 * 1) = 250
    expect(totalPrice).toBe(250);

    // 4. Verify Database Population (The "Populate" check)
    // The controller calls .populate("cart.items.itemId")
    // So the response should contain the full item object (title, price), not just the ID.
    
    // Check Item A details in response
    const responseItemA = cart.find(i => i.itemId._id.toString() === itemA._id.toString());
    expect(responseItemA.quantity).toBe(2);
    expect(responseItemA.itemId.title).toBe("Gaming Mouse"); // Proof that populate worked
    expect(responseItemA.itemId.price).toBe(100);

    // Check Item B details in response
    const responseItemB = cart.find(i => i.itemId._id.toString() === itemB._id.toString());
    expect(responseItemB.quantity).toBe(1);
    expect(responseItemB.itemId.title).toBe("Keyboard");
  });

  test('[BD2DB_INT_006]:Module thành công tăng số lượng sản phẩm đã có và lưu thật vào Database', async () => {
    // --- STEP 1: ARRANGE (Setup Initial State) ---

    // 1. Create Seller & Item
    const seller = await Seller.create({
      name: "Coffee Shop",
      tags: "beverage",
      formattedAddress: "Hanoi",
      imageUrl: ["img.jpg"],
      address: { lat: 10, lng: 10 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    const existingItem = await Item.create({
      title: "Espresso",
      description: "Strong coffee",
      imageUrl: "espresso.jpg",
      price: 30,
      creator: seller._id
    });

    // 2. Create User Account
    const account = await Account.create({
      email: "coffee_lover@test.com",
      password: "123",
      role: "ROLE_USER",
      isVerified: true
    });
    mockLoggedInUserId = account._id;

    // 3. Create User with the Item ALREADY in cart (Quantity: 1)
    // This establishes the "Edit" context (modifying existing cart)
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      account: account._id,
      cart: {
        items: [
          {
            itemId: existingItem._id,
            quantity: 1 // Start with 1
          }
        ]
      }
    });

    // --- STEP 2: ACT (Execute Request) ---
    // User clicks "Add to Cart" again for the same item
    const response = await request(app)
      .post("/cart")
      .send({ itemId: existingItem._id });

    // --- STEP 3: ASSERT (Verify Results) ---

    // 1. Check HTTP Response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Item successfully added to cart.");

    // 2. Verify Database Persistence
    const updatedUser = await User.findById(user._id);

    // Cart size should NOT increase (still 1 unique product)
    expect(updatedUser.cart.items).toHaveLength(1);

    // Quantity should increase from 1 to 2
    expect(updatedUser.cart.items[0].quantity).toBe(2);

    // Verify it's still the correct item
    expect(updatedUser.cart.items[0].itemId.toString()).toBe(existingItem._id.toString());
  })

  test('[BD2DB_INT_007]:Module thành công giảm số lượng sản phẩm, lưu thật vào DB', async () => {
    // --- STEP 1: ARRANGE (Setup Data) ---

    // 1. Create Seller & Item
    const seller = await Seller.create({
      name: "Tea Shop",
      tags: "tea",
      formattedAddress: "Hue",
      imageUrl: ["img.jpg"],
      address: { lat: 15, lng: 107 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    const item = await Item.create({
      title: "Green Tea",
      description: "Fresh",
      imageUrl: "tea.jpg",
      price: 20,
      creator: seller._id
    });

    // 2. Create Account
    const account = await Account.create({
      email: "tea_lover@test.com",
      password: "123",
      role: "ROLE_USER",
      isVerified: true
    });
    mockLoggedInUserId = account._id;

    // 3. Create User with item quantity = 2
    // We start with 2 so that reducing by 1 leaves 1 remaining (proving it didn't just delete the item)
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      account: account._id,
      cart: {
        items: [
          {
            itemId: item._id,
            quantity: 2 // <--- Start with 2
          }
        ]
      }
    });

    // --- STEP 2: ACT (Execute Request) ---
    // Call the endpoint to reduce quantity by 1
    const response = await request(app)
      .post(`/remove-cart-item/${item._id}`);

    // --- STEP 3: ASSERT (Verify Results) ---

    // 1. Check HTTP Response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Item successfully updated.");

    // 2. Verify Database State
    const updatedUser = await User.findById(user._id);

    // The item should still exist in cart
    expect(updatedUser.cart.items).toHaveLength(1);

    // The quantity should be reduced from 2 to 1
    const cartItem = updatedUser.cart.items[0];
    expect(cartItem.itemId.toString()).toBe(item._id.toString());
    expect(cartItem.quantity).toBe(1);
  });

  test('[BD2DB_INT_008]:Module thành công loại bỏ sản phẩm, lưu thật vào DB', async () => {
    // --- STEP 1: ARRANGE (Setup Data) ---

    // 1. Create Seller & Item
    const seller = await Seller.create({
      name: "Book Store",
      tags: "books",
      formattedAddress: "Da Nang",
      imageUrl: ["img.jpg"],
      address: { lat: 16, lng: 108 },
      account: new mongoose.Types.ObjectId(),
      isActive: true
    });

    const itemToDelete = await Item.create({
      title: "NodeJS Guide",
      description: "Learn Node",
      imageUrl: "node.jpg",
      price: 25,
      creator: seller._id
    });

    // 2. Create Account
    const account = await Account.create({
      email: "reader@test.com",
      password: "123",
      role: "ROLE_USER",
      isVerified: true
    });
    mockLoggedInUserId = account._id;

    // 3. Create User with the item IN the cart
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      account: account._id,
      cart: {
        items: [
          {
            itemId: itemToDelete._id,
            quantity: 5 // Quantity doesn't matter for delete, it should remove all
          }
        ]
      }
    });

    // --- STEP 2: ACT (Execute Request) ---
    // Send POST request with itemId in body
    const response = await request(app)
      .post("/delete-cart-item")
      .send({ itemId: itemToDelete._id });

    // --- STEP 3: ASSERT (Verify Results) ---

    // 1. Check HTTP Response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Item successfully removed from cart.");

    // 2. Verify Database State
    const updatedUser = await User.findById(user._id);

    // The cart should now be empty (length 0)
    expect(updatedUser.cart.items).toHaveLength(0);

  });

  test("[BD2DB_INT_009]:should update order status from 'Placed' to 'Cancelled' in the database", async () => {
    // 1. SETUP: Create necessary data in DB
    
    // Create an Account (Role User)
    const account = new Account({
      email: "test@test.com",
      password: "hashedpw",
      role: "ROLE_USER",
    });
    await account.save();

    // Create a User linked to Account
    const user = new User({
      firstName: "Test",
      lastName: "User",
      account: account._id,
      address: { street: "123 Test St", phoneNo: 123456789 },
      cart: { items: [] },
    });
    await user.save();

    // Create a Dummy Seller ID (since we just need the ID for the Order schema)
    const sellerId = new mongoose.Types.ObjectId();

    // Create the Target Order with 'Placed' status
    const order = new Order({
      user: {
        userId: user._id,
        email: account.email,
        address: user.address,
        name: user.firstName,
      },
      seller: {
        phone: 987654321,
        name: "Test Seller",
        sellerId: sellerId,
      },
      items: [
        { item: { name: "Pizza", price: 100 }, quantity: 1 }
      ],
      status: "Placed", // <--- Initial Status
      sessionId: "session_123_unique",
    });
    await order.save();

    // 2. AUTH: Generate a valid JWT
    const token = jwt.sign(
      { email: account.email, userId: user._id.toString(), accountId: account._id.toString() },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // 3. EXECUTE: Send Request
    const res = await request(app)
      .post(`/order-status/${order._id}`)
      .set("Authorization", `Bearer ${token}`) // Attach Token
      .send({
        status: "Cancelled", // <--- The Action
      });

    // 4. ASSERT: Check Response
    expect(res.statusCode).toEqual(200);
    expect(res.body.updatedOrder).toBeDefined();
    expect(res.body.updatedOrder.status).toEqual("Cancelled");

    // 5. VERIFY DB: Query database to ensure persistence
    const savedOrder = await Order.findById(order._id);
    expect(savedOrder.status).toEqual("Cancelled");
  });

  

});