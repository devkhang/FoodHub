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

exports.signupSeller = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 422;
    error.errors = errors.array();
    throw error;
  }

  if (req.files.length == 0) {
    const error = new Error("Upload an image as well.");
    error.statusCode = 422;
    throw error;
  }

  const arrayFiles = req.files.map((file) => file.path);
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const tags = req.body.tags;
  const role = req.body.role;
  const payment = req.body.payment;
  const paymentArray = payment.split(" ");
  const minOrderAmount = req.body.minOrderAmount;
  const costForOne = req.body.costForOne;
  const phoneNo = req.body.phoneNo;
  const street = req.body.street;
  const aptName = req.body.aptName;
  const formattedAddress = req.body.formattedAddress;
  const lat = req.body.lat;
  const lng = req.body.lng;
  const locality = req.body.locality;
  const zip = req.body.zip;

  let token;

  if (role !== "ROLE_SELLER") {
    const error = new Error(
      "Signing up a seller should have a role of ROLE_SELLER"
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
        isVerified: true, //[not done: learn SendGrip]
      });
      return account.save();
    })
    .then((savedAccount) => {
      const seller = new Seller({
        name: name,
        tags: tags,
        imageUrl: arrayFiles,
        minOrderAmount: minOrderAmount,
        costForOne: costForOne,
        account: savedAccount,
        payment: paymentArray,
        formattedAddress: formattedAddress,
        address: {
          street: street,
          zip: zip,
          phoneNo: phoneNo,
          locality: locality,
          aptName: aptName,
          lat: lat,
          lng: lng,
        },
      });
      return seller.save();
    })
    .then((savedSeller) => {
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
          "Seller signed-up successfully, please verify your email before logging in.",
        sellerId: savedSeller._id,
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.createStripeAccount = async (req, res, next) => {
  const { sellerId, sellerData } = res.locals;
  if (!sellerId || !sellerData) {
    const error = new Error('Seller data not found');
    error.statusCode = 500;
    throw error;
  }

  const { email, name, phoneNo, street, locality, zip, aptName } = sellerData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) {
      const error = new Error('Seller not found');
      error.statusCode = 404;
      throw error;
    }
    if (seller.stripeAccountId) {
      const error = new Error('Seller already has a Stripe account');
      error.statusCode = 400;
      throw error;
    }

    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      country: 'VN',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      company: {
        name,
        phone: phoneNo,
        address: {
          city: locality,
          country: 'VN',
          line1: street,
          line2: aptName,
          postal_code: zip,
        },
      },
    });

    seller.stripeAccountId = stripeAccount.id;
    seller.isVerified = false;
    await seller.save({ session });

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: 'https://your-app.com/seller/refresh',
      return_url: 'https://your-app.com/seller/onboard-complete',
      type: 'account_onboarding',
    });

    await session.commitTransaction();

    res.locals.stripeAccountId = stripeAccount.id;
    res.locals.onboardingUrl = accountLink.url;

    console.log(`Saved stripeAccountId ${stripeAccount.id} for seller ${sellerId}`);
    return next();
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating Stripe account:', error);
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  } finally {
    session.endSession();
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
