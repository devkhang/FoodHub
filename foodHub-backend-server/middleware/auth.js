const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const Account = require("../modules/accesscontrol/models/account");

const verifyToken = (req, res) => {
  const authHeader = req.get("Authorization");
  console.log("authHeader : ",authHeader);
  if (!authHeader) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  return decodedToken.accountId;
};

exports.isValid = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error("Validation failed");
        error.statusCode = 422;
        error.errors = errors.array();
        return next(error); // Chặn ngay tại đây
    }
    next(); // Nếu không lỗi, cho vào Controller
};

exports.verifySeller = (req, res, next) => {
  let accountId;
  try {
    // Phải bọc trong try...catch vì verifyToken ném lỗi đồng bộ
    accountId = verifyToken(req, res);
  } catch (err) {
    // Nếu verifyToken lỗi, chuyển ngay cho bộ xử lý lỗi của Express
    return next(err); 
  }
  Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("Internal server error");
        error.statusCode = 500;
        throw error;
      }
      if (account.role !== "ROLE_SELLER") {
        const error = new Error("Forbidden Access");
        error.statusCode = 403;
        throw error;
      }
      req.loggedInUserId = accountId;
      next();
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.verifyUser = (req, res, next) => {
  let accountId;
  try {
    // Phải bọc trong try...catch vì verifyToken ném lỗi đồng bộ
    accountId = verifyToken(req, res);
  } catch (err) {
    // Nếu verifyToken lỗi, chuyển ngay cho bộ xử lý lỗi của Express
    return next(err); 
  }
  Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("Internal server error");
        error.statusCode = 500;
        throw error;
      }
      if (account.role !== "ROLE_USER") {
        const error = new Error("Forbidden Access");
        error.statusCode = 403;
        throw error;
      }
      req.loggedInUserId = accountId;
      next();
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.protect = (req, res, next) => {
  let accountId;
  try {
    accountId = verifyToken(req, res);
  } catch (err) {
    return next(err);
  }
  Account.findById(accountId)
    .select('-password')
    .then((account) => {
      if (!account) {
        const error = new Error("Internal server error");
        error.statusCode = 500;
        throw error;
      }
      req.loggedInUserId = accountId;
      req.user = account;  // Thêm: Gắn full account cho controller (role, email)
      next();
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};