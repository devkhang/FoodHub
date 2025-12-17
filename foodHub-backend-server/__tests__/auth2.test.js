// auth-controller.test.js
const authController = require('../modules/accesscontrol/controllers/authController'); // Đường dẫn tới file controller
const Account = require('../modules/accesscontrol/models/account');
const Seller = require('../modules/accesscontrol/models/seller'); // Cần mock nếu test case là seller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
jest.mock('express-validator');

// --- MOCK CÁC MODULE ---
jest.mock('../modules/accesscontrol/models/account');
jest.mock('../modules/accesscontrol/models/seller');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller - Login (Jest Only)', () => {
    let req, res, next;

    // Chạy trước mỗi test case để reset lại req, res

    test('Đăng nhập thành công', async () => {
        // --- BƯỚC 1: Mock Validation ---
        // Hàm login của bạn không có validationResult, nên bỏ qua bước này.
        
        // --- BƯỚC 2: Mock User/Account (Database) ---
        // Mock Account.findOne trả về một user hợp lệ

        req = {
            body: {
                email: 'user1@gmail.com',
                password: '123456'
            }
        };
        
        // Mock res để có thể chain: res.status(200).json(...)
        res = {
            statusCode: 0,
            jsonData: null,
            status: jest.fn().mockReturnThis(), // Cho phép chain .json() sau .status()
            json: jest.fn().mockImplementation(function (data) {
                this.jsonData = data;
            })
        };
        
        next = jest.fn(); // Mock hàm next
        jest.clearAllMocks(); // Xóa sạch lịch sử gọi mock cũ
        process.env.JWT_SECRET_KEY = 'test_secret_key';
        const mockUser = {
            _id: 'userid_123',
            email: 'user1@gmail.com',
            password: '123456',
            role: 'ROLE_USER',
            isVerified: true, // Quan trọng: phải verified mới login được
            save: jest.fn()
        };
        Account.findOne.mockResolvedValue(mockUser);
        
        // --- BƯỚC 3: Mock Bcrypt (So khớp mật khẩu) ---
        // Giả lập password nhập vào KHỚP với password trong DB
        bcrypt.compare.mockResolvedValue(true);

        // --- BƯỚC 4: Mock JWT (Tạo token) ---
        // Giả lập hàm sign trả về chuỗi token
        jwt.sign.mockReturnValue('mock_token_abc_xyz');

        // --- BƯỚC 5: Gọi hàm Login ---
        await authController.login(req, res, next);

        // --- KIỂM TRA KẾT QUẢ (ASSERTION) ---
        
        // Kiểm tra xem Account.findOne có được gọi đúng email không
        expect(Account.findOne).toHaveBeenCalledWith({ email: 'user1@gmail.com' });

        // Kiểm tra xem bcrypt có được gọi để so sánh không
        expect(bcrypt.compare).toHaveBeenCalledWith('123456', mockUser.password);

        // Kiểm tra xem jwt.sign có được gọi không
        expect(jwt.sign).toHaveBeenCalledWith(
            { accountId: 'userid_123' }, // Payload (lưu ý _id.toString() là string)
            'test_secret_key',           // Secret Key (đã khớp với setup ở trên)
            { expiresIn: "10h" }         // Option
        );

        // Quan trọng nhất: Kiểm tra response trả về
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            message: "Logged-in successfully",
            token: "mock_token_abc_xyz"
        });
        
        // Đảm bảo không có lỗi nào được ném ra (next không được gọi)
        expect(next).not.toHaveBeenCalled();
    });
    test("validation error",()=>{
        req = {
            body: {
                email: 'invalid-email',
                password: '123', // Quá ngắn
                firstName: '',
                lastName: '',
                role: 'ROLE_USER'
            }
        };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(false), // false = Có lỗi
            array: jest.fn().mockReturnValue([
                { msg: 'Email invalid', param: 'email' },
                { msg: 'Password too short', param: 'password' }
            ])
        });

        // --- 2. Gọi hàm và Bắt lỗi (Vì code dùng 'throw') ---
        try {
            authController.login(req, res, next);
        } catch (error) {
            // --- 3. Kiểm tra lỗi ném ra ---
            expect(error).toBeInstanceOf(Error);
            expect(error.statusCode).toBe(422);
            expect(error.message).toBe("Invalid data");
            expect(error.errors).toHaveLength(2); // Có 2 lỗi giả lập
            expect(error.errors[0].msg).toBe('Email invalid');
        }
    })
    test("User Not Found!!",async()=>{
        req = {
            body: {
                email: '',
                password: '123', // Quá ngắn
                firstName: '',
                lastName: '',
                role: 'ROLE_USER'
            }
        };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();     
        validationResult.mockReturnValue({
            isEmpty: jest.fn().mockReturnValue(true), // true = Rỗng = Hợp lệ
            array: jest.fn().mockReturnValue([])
        });

        // --- BƯỚC 2: Mock Account trả về null ---
        // Giả lập database tìm không thấy user nào khớp email
        Account.findOne.mockResolvedValue(null);

        // --- BƯỚC 3: Gọi hàm Login ---
        // Lưu ý: Hàm login phải có 'return Account.findOne...' như đã sửa ở bài trước
        await authController.login(req, res, next);

        // --- BƯỚC 4: Kiểm tra kết quả (Assert) ---
        
        // Kiểm tra Account.findOne có được gọi đúng email không
        expect(Account.findOne).toHaveBeenCalledWith({ email: '' });

        // Kiểm tra xem next có được gọi không (vì code ném lỗi -> catch -> next)
        expect(next).toHaveBeenCalled();

        // Lấy lỗi được truyền vào next(err)
        const errorArg = next.mock.calls[0][0];

        // Kiểm tra chi tiết lỗi
        expect(errorArg).toBeInstanceOf(Error);
        expect(errorArg.statusCode).toBe(401);
        expect(errorArg.message).toBe("Invalid email/password combination.");   
    })
    test('Nên trả về lỗi 401 nếu sai mật khẩu (Wrong Password)', async () => {
        // --- CHUẨN BỊ DỮ LIỆU ĐẦU VÀO ---
        req = {
            body: {
                email: 'wrong@gmail.com',
                password: 'wrong_password' // Mật khẩu nhập vào sai
            }
        };
        res = {
            statusCode: 0,
            // mockReturnThis() là bắt buộc để code có thể gọi res.status().json()
            status: jest.fn().mockReturnThis(), 
            json: jest.fn()
        };
        // --- BƯỚC 2: Mock User/Account tìm thấy user ---
        // Quan trọng: isVerified phải là true, role là ROLE_USER để tránh các check khác
        const mockUser = {
            _id: 'userid_123',
            email: 'wrong@gmail.com',
            password: 'hashed_real_password', // Password thật trong DB
            role: 'ROLE_USER',
            isVerified: true 
        };
        Account.findOne.mockResolvedValue(mockUser);

        // --- BƯỚC 3: Mock Bcrypt trả về FALSE ---
        // Đây là điểm quyết định test case này
        bcrypt.compare.mockResolvedValue(false);

        // --- BƯỚC 4: Gọi hàm Login ---
        await authController.login(req, res, next);

        // --- KIỂM TRA KẾT QUẢ (ASSERTION) ---
        
        // 1. Kiểm tra bcrypt đã được gọi để so sánh
        expect(bcrypt.compare).toHaveBeenCalledWith('wrong_password', 'hashed_real_password');

        // 2. Kiểm tra xem next có được gọi không (Vào nhánh lỗi)
        expect(next).toHaveBeenCalled();

        // 3. Kiểm tra chi tiết lỗi trả về
        const errorArg = next.mock.calls[0][0]; // Lấy tham số lỗi đầu tiên
        expect(errorArg).toBeInstanceOf(Error);
        expect(errorArg.statusCode).toBe(401);
        expect(errorArg.message).toBe("Invalid email/password combination.");
        
        // 4. Đảm bảo KHÔNG gửi response thành công
        expect(res.status).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled(); // Token không được tạo
    });
    test('Nên gọi next(error) với status 500 nếu lỗi Database (Database Exception)', async () => {
        // --- 1. CHUẨN BỊ DỮ LIỆU ---
        req = {
            body: {
                email: 'valid@gmail.com',
                password: '123',
                role:'ROLE_USER'
            }
        };

        // Đảm bảo res được mock đầy đủ (tránh lỗi undefined như bài trước)
        res = {
            statusCode: 0,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn(); // Mock hàm next để hứng lỗi
        jest.clearAllMocks();

        // --- 2. MOCK DATABASE NÉM LỖI (REJECT) ---
        // Tạo một lỗi giả lập
        const dbError = new Error('Database connection failed');
        
        // Giả lập Account.findOne bị lỗi (Reject) thay vì trả về kết quả
        Account.findOne.mockRejectedValue(dbError);

        // --- 3. GỌI HÀM LOGIN ---
        await authController.login(req, res, next);

        // --- 4. KIỂM TRA KẾT QUẢ ---
        
        // Kiểm tra xem DB đã được gọi chưa
        expect(Account.findOne).toHaveBeenCalled();

        // Kiểm tra xem next có được gọi không (Cốt lõi của việc handle lỗi)
        expect(next).toHaveBeenCalled();

        // Lấy tham số lỗi được truyền vào next(err)
        const errorArg = next.mock.calls[0][0];

        // Kiểm tra xem lỗi đó có đúng là lỗi DB không
        expect(errorArg).toBeInstanceOf(Error);
        expect(errorArg.message).toBe('Database connection failed');
        
        // Kiểm tra xem Controller có tự động gán status 500 không
        // (Dựa trên dòng: if (!err.statusCode) err.statusCode = 500;)
        expect(errorArg.statusCode).toBe(500);

        // Đảm bảo không gửi response thành công
        expect(res.status).not.toHaveBeenCalled();
    });
});