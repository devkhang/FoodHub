// Import Controller
const userController = require('../modules/order/controllers/userController');

// Import Models
const Account = require('../modules/accesscontrol/models/account');
const User = require('../modules/accesscontrol/models/user');
const Seller = require('../modules/accesscontrol/models/seller');
const Order = require('../modules/order/models/order');

// Import Utils
const io = require('../util/socket');
const app = require('../app'); // Import app để mock app.clients

// --- MOCK ---
jest.mock('../modules/accesscontrol/models/account');
jest.mock('../modules/accesscontrol/models/user');
jest.mock('../modules/accesscontrol/models/seller');
jest.mock('../modules/order/models/order');
jest.mock('../util/socket');
jest.mock('../app', () => ({
    clients: {} // Mock object clients rỗng ban đầu
}));
const flushPromises = () => new Promise(resolve => setImmediate(resolve));
describe('User Controller - Post Order (Create Order)', () => {
    let req, res, next;

    beforeEach(() => {
        // Setup Req/Res
        req = {
            loggedInUserId: 'user_account_id_123',
            body: {
                session_id: 'stripe_session_abc123'
            }
        };

        res = {
            statusCode: 0,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
    });

    test('1. Tạo đơn hàng thành công (Happy Path)', async () => {
        // --- 1. MOCK DỮ LIỆU GIẢ ---
        
        // Mock Account
        const mockAccount = { _id: 'acc_123', email: 'test@mail.com' };
        Account.findById.mockResolvedValue(mockAccount);

        // Mock User & Cart Logic
        const mockCartItem = {
            quantity: 2,
            itemId: {
                _id: 'item_1',
                price: 100,
                creator: 'seller_123', // ID của người bán
                _doc: { name: 'Pizza', price: 100 } // Data gốc của item
            }
        };

        const mockUser = {
            _id: 'user_123',
            firstName: 'Nguyen',
            address: 'Hanoi',
            // Mock chuỗi populate().execPopulate()
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue({
                firstName: 'Nguyen',
                address: 'Hanoi',
                cart: {
                    items: [mockCartItem] // Giỏ hàng có 1 món
                }
            }),
            clearCart: jest.fn().mockResolvedValue(true)
        };
        // User.findOne trả về mockUser để chain tiếp populate
        User.findOne.mockResolvedValue(mockUser);

        // Mock Seller
        const mockSeller = {
            _id: 'seller_123',
            name: 'Pizza Hut',
            address: { phoneNo: '099999999' }
        };
        Seller.findById.mockResolvedValue(mockSeller);

        // Mock Socket.IO Logic
        // Code của bạn: app.clients[clientId].socket
        // Code của bạn: io.getIO().sockets.connected[...]
        app.clients['seller_123'] = { socket: 'socket_id_xyz' }; // Giả lập seller đang online

        const mockSocketEmit = jest.fn();
        io.getIO.mockReturnValue({
            sockets: {
                connected: {
                    'socket_id_xyz': { emit: mockSocketEmit }
                }
            }
        });

        // Mock Order Model (Constructor & Save)
        // Vì Order là class (new Order), ta cần mock implementation
        const saveMock = jest.fn().mockResolvedValue({ _id: 'new_order_999' });
        Order.mockImplementation(() => ({
            save: saveMock
        }));

        // --- 2. GỌI HÀM ---
        await userController.postOrder(req, res, next);
        
        await flushPromises(); // Chờ Account.findById xong
        await flushPromises(); // Chờ User.findOne xong
        await flushPromises(); // Chờ execPopulate xong
        await flushPromises(); // Chờ Seller.findById (trong vòng lặp) xong
        await flushPromises(); // Chờ Order.save xong
        // --- 3. ASSERTIONS (Kiểm tra kết quả) ---

        // A. Kiểm tra luồng dữ liệu
        expect(Account.findById).toHaveBeenCalledWith('user_account_id_123');
        expect(User.findOne).toHaveBeenCalled();
        
        // B. Kiểm tra Seller được tìm dựa trên item creator
        expect(Seller.findById).toHaveBeenCalledWith('seller_123');

        // C. Kiểm tra Order được khởi tạo và Save
        expect(Order).toHaveBeenCalledTimes(1); // constructor được gọi
        expect(saveMock).toHaveBeenCalled(); // .save() được gọi
        
        // Kiểm tra data truyền vào constructor Order
        const orderConstructorArgs = Order.mock.calls[0][0];
        expect(orderConstructorArgs).toMatchObject({
            sessionId: 'stripe_session_abc123',
            status: 'Placed',
            user: { email: 'test@mail.com', name: 'Nguyen' },
            seller: { name: 'Pizza Hut' }
        });

        // D. Kiểm tra Socket được bắn thông báo cho Seller
        expect(mockSocketEmit).toHaveBeenCalledWith('orders', expect.objectContaining({
            action: 'create'
        }));

        // E. Kiểm tra Giỏ hàng được xóa
        expect(mockUser.clearCart).toHaveBeenCalled();

        // F. Kiểm tra Response trả về Client
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
    });

    test('2. Validation: Trả về lỗi 400 nếu thiếu session_id', async () => {
        req.body.session_id = undefined; // Giả lập thiếu input

        userController.postOrder(req, res, next);
        // Không cần flushPromises vì lỗi này bị bắt ngay đầu hàm

        expect(next).toHaveBeenCalled();
        const err = next.mock.calls[0][0];
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe("Thiếu session_id");
    });

    test('3. Empty Cart: Không tạo đơn nào nếu giỏ hàng trống', async () => {
        Account.findById.mockResolvedValue({ _id: 'acc_123' });
        
        // Mock Cart Rỗng []
        User.findOne.mockResolvedValue({
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue({
                cart: { items: [] } 
            }),
            clearCart: jest.fn()
        });

        userController.postOrder(req, res, next);
        await flushPromises();

        expect(Seller.findById).not.toHaveBeenCalled(); // Không tìm seller
        expect(Order).not.toHaveBeenCalled(); // Không tạo đơn
        expect(res.status).toHaveBeenCalledWith(200); // Vẫn trả về OK
    });
    test('4. Data Error: Báo lỗi nếu tìm không thấy Seller (Orphan Item)', async () => {
        Account.findById.mockResolvedValue({ _id: 'acc_123' });
        
        User.findOne.mockResolvedValue({
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue({
                cart: { items: [{ itemId: { creator: 'deleted_seller' }, quantity: 1 }] }
            }),
            clearCart: jest.fn()
        });

        // QUAN TRỌNG: Seller trả về null
        Seller.findById.mockResolvedValue(null);

        userController.postOrder(req, res, next);
        await flushPromises(); await flushPromises(); await flushPromises();

        // Mong đợi: Code sẽ crash khi gọi `seller.name` -> Promise reject -> next(err)
        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toBeInstanceOf(Error); // Thường là TypeError
    });
    test('5. System Error: Gọi next(err) nếu Order.save() thất bại', async () => {
        // Setup data hợp lệ
        Account.findById.mockResolvedValue({});
        User.findOne.mockResolvedValue({
            populate: jest.fn().mockReturnThis(),
            execPopulate: jest.fn().mockResolvedValue({
                cart: { items: [{ itemId: { creator: 'seller_1', _doc: {} }, quantity: 1 }] }
            }),
            clearCart: jest.fn()
        });
        Seller.findById.mockResolvedValue({ _id: 'seller_1', name: 'Shop 1', address: {} });

        // MOCK SAVE LỖI
        const dbError = new Error("DB Connection Failed");
        const saveMock = jest.fn().mockRejectedValue(dbError); // Promise Reject
        
        Order.mockImplementation(() => ({ 
            save: saveMock
        }));

        userController.postOrder(req, res, next);
        
        // Cần flush đủ sâu để vào đến đoạn .catch((err) => next(err))
        await flushPromises(); await flushPromises(); await flushPromises(); 

        // Kiểm tra next có được gọi với đúng lỗi không
        expect(next).toHaveBeenCalledWith(dbError);
    });
});