// Mock the dependencies
jest.mock('../modules/menu/models/item');
jest.mock('../modules/accesscontrol/models/account');
jest.mock('../modules/accesscontrol/models/user');
jest.mock("../app.js", () => {
  return {}; // Return an empty object instead of the real app
});

const userController = require('../modules/order/controllers/userController');
const Account = require("../modules/accesscontrol/models/account");
const User = require("../modules/accesscontrol/models/user"); 
const Item = require("../modules/menu/models/item");


describe('postCart Whitebox - Basis Path Testing', () => {
  let req, res, next;

  beforeEach(() => {
    console.log("================ beforeEach")
    req = { body: { itemId: 'item123' }, loggedInUserId: 'user789' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });
  afterEach(()=>{
    jest.clearAllMocks();
  })

  // Path 1: 1 -> 2 -> 3 (Synchronous Validation Error)
  test('[wb_unit_0001]:Path 1: Throw error if itemId is missing', () => {
    req.body.itemId = null;
    expect(() => userController.postCart(req, res, next)).toThrow("ItemId not provided");
  });

  // Path 2: 1 -> 2 -> 4 -> 5 -> 6 -> 7 -> 8 (The Happy Path)
  test('[wb_unit_0002]:Path 2: Success execution to Node 8', async () => {
    const mockUser = { addToCart: jest.fn().mockResolvedValue(true) };
    
    Item.findById.mockResolvedValue({ _id: 'item123' }); // Node 4
    Account.findById.mockResolvedValue({ _id: 'acc456' }); // Node 5
    User.findOne.mockResolvedValue(mockUser); // Node 6 & 7

    let res1=await userController.postCart(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200); // Node 8 reached
    expect(res.json).toHaveBeenCalledWith({ message: "Item successfully added to cart." });
  });

  // Path 3: 1 -> 2 -> 4 -> 9 (Item Find Failure)
  test('[wb_unit_0003]:Path 3: Fail at Node 4, jump to Node 9', async () => {
    Item.findById.mockRejectedValue(new Error("DB Item Fail")); // Force Node 9
    
    await userController.postCart(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "DB Item Fail" }));
  });

  // Path 4: 1 -> 2 -> 4 -> 5 -> 9 (Account Find Failure)
  test('[wb_unit_0004]:Path 4: Fail at Node 5, jump to Node 9', async () => {
    Item.findById.mockResolvedValue({ _id: 'item123' });
    Account.findById.mockRejectedValue(new Error("DB Account Fail")); // Force Node 9
    
    await userController.postCart(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  // Path 5: 1 -> 2 -> 4 -> 5 -> 6 -> 9 (User Find Failure)
  test('[wb_unit_0005]:Path 5: Fail at Node 6, jump to Node 9', async () => {
    Item.findById.mockResolvedValue({ _id: 'item123' });
    Account.findById.mockResolvedValue({ _id: 'acc456' });
    User.findOne.mockRejectedValue(new Error("DB User Fail")); // Force Node 9
    
    await userController.postCart(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  // Path 6: 1 -> 2 -> 4 -> 5 -> 6 -> 7 -> 9 (Add to Cart Failure)
  test('[wb_unit_0006]:Path 6: Fail at Node 7, jump to Node 9', async () => {
    const mockUser = { addToCart: jest.fn().mockRejectedValue(new Error("Cart Logic Fail")) };
    Item.findById.mockResolvedValue({ _id: 'item123' });
    Account.findById.mockResolvedValue({ _id: 'acc456' });
    User.findOne.mockResolvedValue(mockUser);
    
    await userController.postCart(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  // Path 7: 1 -> 2 -> 4 (Immediate Exit or Null Check if applicable)
  test('[wb_unit_0007]:Path 7: Verify Node 4 is called with correct itemId', async () => {
    Item.findById.mockResolvedValue(null); // Node 4 resolves, but chain stops or errors
    await userController.postCart(req, res, next);
    expect(Item.findById).toHaveBeenCalledWith('item123');
  });
});