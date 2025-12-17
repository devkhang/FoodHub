const itemController = require('../modules/menu/controllers/itemController');
const Item = require('../modules/menu/models/item');
const Seller = require('../modules/accesscontrol/models/seller');
const Account = require('../modules/accesscontrol/models/account');
const { validationResult } = require('express-validator');
const fs = require('fs'); // Import fs thật

// --- 1. MOCK CÁC DEPENDENCIES ---
jest.mock('../modules/menu/models/item');
jest.mock('../modules/accesscontrol/models/seller');
jest.mock('../modules/accesscontrol/models/account');
jest.mock('express-validator');
// KHÔNG mock fs ở đây để tránh lỗi Out of Memory

// --- HÀM TIỆN ÍCH CHỜ PROMISE ---
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Menu Controller (ItemController)', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            loggedInUserId: 'account_id_123',
            body: {
                title: 'Pizza',
                price: 100,
                description: 'Delicious',
                tags: 'food'
            },
            params: { itemId: 'item_id_123' }
        };

        res = {
            statusCode: 0,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
        jest.restoreAllMocks(); // Quan trọng: Reset lại spyOn sau mỗi test
    });

    // ==========================================
    // TEST: createItem
    // ==========================================
    describe('createItem', () => {
        
        test('Nên ném lỗi 422 nếu Validation thất bại', () => {
            validationResult.mockImplementation(() => ({
                isEmpty: () => false,
                array: () => [{ msg: 'Error' }]
            }));

            expect(() => {
                itemController.createItem(req, res, next);
            }).toThrow('Validation Failed');
        });

        test('Nên ném lỗi 422 nếu không có file ảnh', () => {
            validationResult.mockImplementation(() => ({ isEmpty: () => true }));
            req.file = undefined;

            expect(() => {
                itemController.createItem(req, res, next);
            }).toThrow('Upload an image as well');
        });

        test('Happy Path: Tạo món ăn thành công', async () => {
            // Setup
            validationResult.mockImplementation(() => ({ isEmpty: () => true }));
            req.file = { path: 'images/pizza.jpg' };

            Account.findById.mockResolvedValue({ _id: 'account_id_123' });
            
            const mockSeller = { 
                _id: 'seller_id_123', 
                items: { push: jest.fn() }, 
                save: jest.fn().mockResolvedValue(true)
            };
            Seller.findOne.mockResolvedValue(mockSeller);

            const saveItemMock = jest.fn().mockResolvedValue({ _id: 'new_item_id', title: 'Pizza' });
            Item.mockImplementation(() => ({ save: saveItemMock }));

            // RUN
            itemController.createItem(req, res, next);
            
            // WAIT: Vì controller dùng chain .then() lồng nhau, cần flush vài lần
            await flushPromises(); // Account.findById
            await flushPromises(); // Seller.findOne
            await flushPromises(); // item.save
            await flushPromises(); // seller.save

            // ASSERT
            expect(Account.findById).toHaveBeenCalledWith('account_id_123');
            expect(Seller.findOne).toHaveBeenCalledWith({ account: 'account_id_123' });
            expect(saveItemMock).toHaveBeenCalled(); 
            expect(mockSeller.items.push).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    // ==========================================
    // TEST: getItems
    // ==========================================
    describe('getItems', () => {
        test('Nên trả về danh sách items của Seller', async () => {
            const mockSeller = { items: ['id1', 'id2'] };
            const mockItems = [{ title: 'A' }, { title: 'B' }];

            Account.findById.mockResolvedValue({ _id: 'acc_123' });
            Seller.findOne.mockResolvedValue(mockSeller);
            Item.find.mockResolvedValue(mockItems);

            // RUN
            itemController.getItems(req, res, next);

            // WAIT
            await flushPromises(); // Account.findById
            await flushPromises(); // Seller.findOne
            await flushPromises(); // Item.find

            // ASSERT
            expect(Item.find).toHaveBeenCalledWith({ _id: { $in: mockSeller.items } });
            expect(res.json).toHaveBeenCalledWith({ items: mockItems });
        });
    });

    // ==========================================
    // TEST: deleteItem
    // ==========================================
    describe('deleteItem', () => {
        test('Nên xóa item và cập nhật seller thành công', async () => {
            const mockItem = { _id: 'item_123', imageUrl: 'images/old.jpg' };
            Item.findById.mockResolvedValue(mockItem);
            Item.findByIdAndRemove.mockResolvedValue(true);

            Account.findById.mockResolvedValue({ _id: 'acc_123' });
            const mockSeller = { items: { pull: jest.fn() }, save: jest.fn() };
            Seller.findOne.mockResolvedValue(mockSeller);

            // SPY ON FS (Thay vì mockImplementation trực tiếp)
            const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));

            // RUN
            itemController.deleteItem(req, res, next);

            // WAIT
            await flushPromises(); // Item.findById
            await flushPromises(); // Item.findByIdAndRemove
            await flushPromises(); // Account.findById
            await flushPromises(); // Seller.findOne
            await flushPromises(); // seller.save

            // ASSERT
            expect(unlinkSpy).toHaveBeenCalled(); // Kiểm tra Spy
            expect(Item.findByIdAndRemove).toHaveBeenCalledWith('item_id_123');
            expect(mockSeller.items.pull).toHaveBeenCalledWith('item_id_123');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ==========================================
    // TEST: editItem
    // ==========================================
    describe('editItem', () => {
        test('Nên cập nhật item thành công (Có upload ảnh mới)', async () => {
            validationResult.mockImplementation(() => ({ isEmpty: () => true }));
            req.file = { path: 'images/new-pizza.jpg' };

            const mockItem = {
                imageUrl: 'images/old-pizza.jpg',
                title: 'Old Title',
                save: jest.fn().mockResolvedValue('updated_item_obj')
            };
            Item.findById.mockResolvedValue(mockItem);
            
            // SPY ON FS
            const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));

            // RUN
            itemController.editItem(req, res, next);
            
            // WAIT
            await flushPromises(); // Item.findById
            await flushPromises(); // item.save

            // ASSERT
            expect(unlinkSpy).toHaveBeenCalled();
            expect(mockItem.imageUrl).toBe('images/new-pizza.jpg');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('Nên cập nhật item thành công (Giữ nguyên ảnh cũ)', async () => {
            validationResult.mockImplementation(() => ({ isEmpty: () => true }));
            req.file = undefined;
            req.body.image = 'images/old-pizza.jpg';

            const mockItem = {
                imageUrl: 'images/old-pizza.jpg',
                save: jest.fn().mockResolvedValue('updated_item_obj')
            };
            Item.findById.mockResolvedValue(mockItem);
            
            // SPY ON FS
            const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, cb) => cb(null));

            // RUN
            itemController.editItem(req, res, next);

            // WAIT
            await flushPromises();

            // ASSERT
            expect(unlinkSpy).not.toHaveBeenCalled(); // Spy không được gọi
            expect(mockItem.imageUrl).toBe('images/old-pizza.jpg');
        });
    });
});