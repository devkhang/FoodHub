const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const jwt = require("jsonwebtoken");
const dotevn=require("dotenv");
const path=require("path");
dotevn.config(path.join(__dirname, ".env"));

const User = require("../models/user");
const Account = require("../models/account");
const Seller = require("../models/seller");
const DeliveryPartner = require("../models/deliveryPartner");
const DeliveryDetail = require("../../Delivery/models/deliveryDetail");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// NOT Done (học sendgrid)
// const transporter = nodemailer.createTransport(
//   sendgridTransport({
//     auth: {
//       api_key: process.env.SENDGRID_KEY,
//     },
//   })
// );

exports.signupUser = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 422;
    error.errors = errors.array();
    throw error;
  }

  const email = req.body.email;
  const firstName = req.body.firstName;
  const password = req.body.password;
  const lastName = req.body.lastName;
  const role = req.body.role;
  let token;

  if (role !== "ROLE_USER") {
    const error = new Error(
      "Signing up an user should have a role of ROLE_USER"
    );
    error.statusCode = 500;
    throw error;
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      token = crypto.randomBytes(32).toString("hex");

      const account = new Account({
        role: role,
        email: email,
        password: hashedPassword,
        accountVerifyToken: token,
        accountVerifyTokenExpiration: Date.now() + 3600000,
        isVerified: true, //[not done: learn Send Grid]
      });
      return account.save();
    })
    .then((savedAccount) => {
      const user = new User({
        firstName: firstName,
        lastName: lastName,
        account: savedAccount,
      });
      return user.save();
    })
    .then((savedUser) => {
      // transporter.sendMail({
      //   to: email,
      //   from: "YOUR_SENDGRID_VERIFIED_EMAIL",
      //   subject: "Verify your Account on FoodHub",
      //   html: `
      //                 <p>Please verify your email by clicking on the link below - FoodHub</p>
      //                 <p>Click this <a href="http://localhost:3002/auth/verify/${token}">link</a> to verify your account.</p>
      //               `,
      // });
      res.status(201).json({
        message:
          "User signed-up successfully, please verify your email before logging in.",
        userId: savedUser._id,
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// Giả định các module sau đã được import ở đầu file:
// const { validationResult } = require('express-validator');
// const bcrypt = require('bcryptjs'); // hoặc 'bcrypt'
// const crypto = require('crypto');
// const DeliveryPartner = require('./path/to/DeliveryPartnerModel');

// Lưu ý: Đảm bảo bạn đã import các thư viện cần thiết:
// const { validationResult } = require('express-validator');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');
// const DeliveryPartner = require('../models/deliveryPartner'); // Giả định
// const Account = require('../models/account'); // Giả định

exports.signUpDeliveryPartner = (req, res, next) => {
  // 1. XỬ LÝ LỖI XÁC THỰC (VALIDATION)
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 422; // Unprocessable Entity
    error.errors = errors.array();
    throw error;
  }
  // 2. KIỂM TRA VÀ TRÍCH XUẤT DỮ LIỆU TỪ BODY VÀ FILES

  // Khi dùng upload.fields(), req.files là một object, không phải mảng.
  // Tên trường phải khớp với định nghĩa trong auth.js: 'portrait', 'licenseFront', 'licenseBack'
  const files = req.files;

  // Kiểm tra xem 3 trường file có tồn tại không
  if (!files || !files.portrait || !files.licenseFront || !files.licenseBack) {
    const error = new Error(
      "Vui lòng tải lên đủ 3 ảnh: Chân dung, Giấy phép trước, Giấy phép sau."
    );
    error.statusCode = 422;
    return next(error);
  }

  // TRÍCH XUẤT DỮ LIỆU TỪ BODY
  const email = req.body.email;
  const password = req.body.password;
  const phone = req.body.phone;
  const firstName = req.body.firstName; // SỬA: Dùng key 'FirstName' theo client
  const lastName = req.body.lastName; // SỬA: Dùng key 'LastName' theo client
  const CCCD = req.body.CCCD;
  // TRÍCH XUẤT PATH TỪ req.files (LƯU Ý: mỗi trường là một mảng 1 phần tử)
  const portraitPhotoUrl = files.portrait[0].path;
  const licenseFrontPhotoUrl = files.licenseFront[0].path;
  const licenseBackPhotoUrl = files.licenseBack[0].path;

  let token;
  const role = "ROLE_DELIVERY"; // Đặt vai trò cố định cho Delivery Partner
  // 3. BĂM MẬT KHẨU VÀ LƯU DỮ LIỆU
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      token = crypto.randomBytes(32).toString("hex");

      // TẠO VÀ LƯU ĐỐI TƯỢNG ACCOUNT
      const account = new Account({
        role: role,
        email: email,
        password: hashedPassword,
        accountVerifyToken: token,
        accountVerifyTokenExpiration: Date.now() + 3600000,
        isVerified: true,
      });
      return account.save();
    })
    .then((savedAccount) => {
      // TẠO VÀ LƯU ĐỐI TÁC GIAO HÀNG, LIÊN KẾT VỚI ACCOUNT VỪA TẠO
      const deliveryPartners = new DeliveryPartner({
        phone: phone,
        firstName: firstName,
        lastName: lastName,
        CCCD:CCCD,
        // LƯU CÁC PATH/URL ĐÃ LẤY TỪ req.files
        portraitPhotoUrl: portraitPhotoUrl,
        licenseFrontPhotoUrl: licenseFrontPhotoUrl,
        licenseBackPhotoUrl: licenseBackPhotoUrl,

        account: savedAccount,
      });
      return deliveryPartners.save();
    })
    .then((savedPartner) => {
      // 4. PHẢN HỒI THÀNH CÔNG
      res.status(201).json({
        message:
          "Delivery Partner signed-up successfully. Verification process pending.",
        partnerId: savedPartner._id,
      });
    })
    .catch((err) => {
      // 5. XỬ LÝ LỖI CHUNG
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.verifyAccount = (req, res, next) => {
  const token = req.params.token;
  Account.findOne({
    accountVerifyToken: token,
    accountVerifyTokenExpiration: { $gt: Date.now() },
  })
    .then((account) => {
      if (!account) {
        const error = new Error(
          "Token in the url is tempered, don't try to fool me!"
        );
        error.statusCode = 403;
        throw error;
      }
      account.isVerified = true;
      account.accountVerifyToken = undefined;
      account.accountVerifyTokenExpiration = undefined;
      return account.save();
    })
    .then((account) => {
      res.json({ message: "Account verified successfully." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  Account.findOne({ email: email })
    .then((account) => {
      if (!account) {
        const error = new Error("Invalid email/password combination.");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = account;
      return bcrypt.compare(password, account.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Invalid email/password combination.");
        error.statusCode = 401;
        throw error;
      }
      if (loadedUser.isVerified === false) {
        const error = new Error(
          "Verify your email before accessing the platform."
        );
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        { accountId: loadedUser._id.toString() },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "10h" }
      );
      res.status(200).json({ message: "Logged-in successfully", token: token });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// 

exports.signupSeller = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Dữ liệu không hợp lệ');
    err.statusCode = 422;
    err.errors = errors.array();
    return next(err);
  }

  const images = req.files.map(f => f.path);
  const {
    email, password, name, tags, payment,
    phoneNo, street, aptName, locality, zip,
    costForOne, minOrderAmount, formattedAddress, lat, lng
  } = req.body;

  try {
    // LẤY TỪ MIDDLEWARE
    const stripeAccountId = req.stripeAccountId;
    const onboardingUrl   = req.onboardingUrl;
    const token = req.verifyToken;                    // ← LẤY TỪ MIDDLEWARE
    const expires = req.tokenExpires;
    // === GIỮ NGUYÊN TOKEN NHƯ CŨ, KHÔNG GỬI verifyUrl ===
    const hashedPw = await bcrypt.hash(password, 12);
    const account = new Account({
      role: 'ROLE_SELLER',
      email,
      password: hashedPw,
      accountVerifyToken: token,
      accountVerifyTokenExpiration: Date.now() + 3600000,
    });
    const savedAcc = await account.save();

    const seller = new Seller({
      name, tags, imageUrl: images,
      payment: payment.split(' '),
      minOrderAmount, costForOne,
      formattedAddress,
      address: { street, aptName, locality, zip, phoneNo, lat, lng },
      account: savedAcc._id,
      stripeAccountId
    });
    await seller.save();

    // === CHỈ TRẢ VỀ 1 LINK DUY NHẤT ===
    res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng check mail để kích hoạt.',
      sellerId: seller._id,
      stripeAccountId,
      onboardingUrl   // ← DUY NHẤT 1 LINK
      // verifyUrl: ...   ← ĐÃ XÓA
    });
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};

exports.createStripeAccount = async (req, res, next) => {
  const { email, name } = req.body;
  try {
    // BƯỚC 1: TẠO STRIPE CONNECT ACCOUNT
    const token = crypto.randomBytes(32).toString('hex');
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      metadata: { restaurant_name: name },
    });
    // BƯỚC 2: TẠO LINK ONBOARDING
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      return_url: `${process.env.FRONTEND_URL}/onboarding/success?accountId=${account.id}`,
      refresh_url: `${process.env.FRONTEND_URL}/onboarding/refresh`,
      type: 'account_onboarding'
    });
    // BƯỚC 3: GẮN VÀO req ĐỂ DÙNG TIẾP
    req.stripeAccountId = account.id;      // acct_…
    req.onboardingUrl   = accountLink.url;        // link ngân hàng
    req.verifyToken     = token;           // token lưu vào Account
    req.tokenExpires    = Date.now() + 3600000;      // link Stripe

    next(); // → nhảy sang signupSeller
  } catch (error) {
    console.log(error.message);
    const err = new Error('Tạo Stripe thất bại!');
    err.statusCode = 500;
    err.details = error.message;
    next(err);
  }
};

exports.imagesTest = (req, res, next) => {
  if (!req.files) {
    const error = new Error("Upload an image as well.");
    error.statusCode = 422;
    throw error;
  }

  const arrayFiles = req.files.map((file) => file.path);
  console.log(arrayFiles);

  res.status(200).json({ message: "success" });
};
