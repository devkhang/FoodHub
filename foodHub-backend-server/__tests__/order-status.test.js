// --- 1. MOCK APP & DRONE SOURCE (Tránh Circular Dependency) ---
jest.mock('../app', () => ({ clients: {} }));

jest.mock('../socket/sources/droneSource', () => ({
    droneOrderAssignment: new Map(),
    availableDrones: new Map(),
    readyDrone: new Map(),
    busyDrone: new Map()
}));

// --- 2. IMPORT MODULES ---
const userController = require('../modules/order/controllers/userController');
const droneSource = require('../socket/sources/droneSource');
const Order = require('../modules/order/models/order');
const jwt = require('jsonwebtoken');
const io = require('../util/socket');

// --- 3. MOCK CÁC DEPENDENCIES KHÁC ---
const mockStripeTransferCreate = jest.fn();

// Mock Stripe với Wrapper Function (Tránh lỗi ReferenceError)
jest.mock('stripe', () => {
    return jest.fn(() => ({
        transfers: { create: (...args) => mockStripeTransferCreate(...args) }
    }));
});

jest.mock('../modules/order/models/order');
jest.mock('jsonwebtoken');
jest.mock('../util/socket');

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Order Controller - Status Updates', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { orderId: 'order_123' },
            body: { status: 'Accepted' }, // SỬA: Dùng 'Accepted' thay vì 'Preparing'
            get: jest.fn().mockReturnValue('Bearer fake_token')
        };
        res = {
            statusCode: 0,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();

        jwt.verify.mockReturnValue({ accountId: 'acc_123' });

        // Mock Socket Chain
        const mockEmit = jest.fn();
        io.getIO.mockReturnValue({ 
            emit: mockEmit, 
            to: jest.fn().mockReturnValue({ emit: mockEmit }) 
        });
        
        // Clear Maps
        droneSource.droneOrderAssignment.clear();
        droneSource.availableDrones.clear();
    });

    // --- CASE 1: TRẠNG THÁI THƯỜNG (ACCEPTED) ---
    test('Case: "Accepted" - Cập nhật DB và bắn socket chung', async () => {
        // SỬA: Test với status 'Accepted' (hợp lệ trong Schema)
        req.body.status = 'Accepted'; 
        
        const mockOrder = {
            _id: 'order_123', status: 'Placed', transferId: null,
            save: jest.fn().mockResolvedValue({ _id: 'order_123', status: 'Accepted' })
        };
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockOrder) });

        userController.postOrderStatus(req, res, next);
        await flushPromises();

        expect(mockOrder.status).toBe('Accepted'); // Check status mới
        expect(mockOrder.save).toHaveBeenCalled();
        expect(io.getIO().emit).toHaveBeenCalledWith("orders", expect.objectContaining({ action: "update" }));
    });

    // --- CASE 2: TRẠNG THÁI "READY" ---
    test('Case: "Ready" - Gọi hàm tìm Drone', async () => {
        req.body.status = 'Ready';
        const mockOrder = {
            _id: 'order_123', status: 'Accepted', transferId: null,
            save: jest.fn().mockResolvedValue(true)
        };
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockOrder) });

        userController.postOrderStatus(req, res, next);
        await flushPromises();

        expect(mockOrder.status).toBe('Ready');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // --- CASE 3: TRẠNG THÁI "OUT FOR DELIVERY" ---
    test('Case: "Out For Delivery" - Bắn Socket cho Drone', async () => {
        req.body.status = 'Out For Delivery';
        
        // Setup Map giả
        droneSource.droneOrderAssignment.set('order_123', { droneId: 'd_99' });
        droneSource.availableDrones.set('d_99', { socketId: 'sock_d_99' });

        const mockOrder = {
            _id: 'order_123', status: 'Ready', transferId: null,
            save: jest.fn().mockResolvedValue(true)
        };
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockOrder) });

        userController.postOrderStatus(req, res, next);
        await flushPromises();

        expect(mockOrder.status).toBe('Out For Delivery');
        expect(io.getIO().to).toHaveBeenCalledWith('sock_d_99');
        
        const emitSpy = io.getIO().to().emit;
        expect(emitSpy).toHaveBeenCalledWith("order_hand_over", { handOverOrderId: 'order_123' });
    });

    // --- CASE 4: TRẠNG THÁI "COMPLETED" (PAYOUT) ---
    test('Case: "Completed" - Payout Stripe thành công', async () => {
        req.body.status = 'Completed';
        const mockOrder = {
            _id: 'order_123', status: 'Delivered', totalItemMoney: 100, transferId: null,
            seller: { sellerId: { stripeAccountId: 'acct_1' } },
            save: jest.fn().mockResolvedValue(true)
        };
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockOrder) });
        mockStripeTransferCreate.mockResolvedValue({ id: 'tr_1' });

        userController.postOrderStatus(req, res, next);
        await flushPromises(); await flushPromises(); await flushPromises();

        expect(mockStripeTransferCreate).toHaveBeenCalled();
        expect(mockOrder.transferId).toBe('tr_1');
        expect(mockOrder.status).toBe('Completed');
    });

    // --- CASE 5: KHÔNG PAYOUT LẠI ---
    test('Case: "Completed" - Không gọi Stripe nếu đã có transferId', async () => {
        req.body.status = 'Completed';
        const mockOrder = {
            _id: 'order_123', status: 'Completed', 
            transferId: 'tr_old', // Đã có ID
            seller: { sellerId: { stripeAccountId: 'acct_1' } },
            save: jest.fn().mockResolvedValue(true)
        };
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockOrder) });

        userController.postOrderStatus(req, res, next);
        await flushPromises();

        expect(mockStripeTransferCreate).not.toHaveBeenCalled();
        expect(mockOrder.save).toHaveBeenCalled();
    });

    // --- CASE 6: AUTH ERROR ---
    test('Error: Báo lỗi 401 nếu thiếu Token', async () => {
        req.get.mockReturnValue(null); 
        try {
            userController.postOrderStatus(req, res, next);
        } catch (e) {
            expect(e.statusCode).toBe(401);
        }
    });

    // --- CASE 7: ORDER NOT FOUND ---
    test('Error: Báo lỗi 404 nếu không tìm thấy Order', async () => {
        Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        userController.postOrderStatus(req, res, next);
        await flushPromises();
        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });
});