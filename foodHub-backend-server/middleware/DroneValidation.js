const { body, validationResult } = require('express-validator');
const { matchedData } = require('express-validator');
const Drone = require('../modules/accesscontrol/models/drone')
// Validation cho POST /create
exports.validateCreateDrone = [
  body('droneId')
    .isString().withMessage('droneId phải là string')
    .notEmpty().withMessage('droneId không được rỗng')
    .matches(/^DRN-\d{3}$/).withMessage('droneId phải theo format DRN-XXX (X là số)'),
  body('model')
    .isString().withMessage('model phải là string')
    .notEmpty().withMessage('model không được rỗng'),
  body('status')
    .optional()
    .isIn(['IDLE', 'BUSY']).withMessage('status phải là IDLE hoặc BUSY'),
  body('homeBase.lat')
    .isFloat({ min: -90, max: 90 }).withMessage('lat phải là số từ -90 đến 90'),
  body('homeBase.lng')
    .isFloat({ min: -180, max: 180 }).withMessage('lng phải là số từ -180 đến 180'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }
    req.validatedData = matchedData(req, { locations: ['body'] });
    next();
  }
];

// Validation cho PATCH /:droneId
exports.validateUpdateDrone = [
  body('model')
    .optional()
    .isString().withMessage('model phải là string')
    .notEmpty().withMessage('model không được rỗng'),
  body('status')
    .optional()
    .isIn(['IDLE', 'BUSY']).withMessage('status phải là IDLE hoặc BUSY'),
  body('homeBase.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('lat phải là số từ -90 đến 90'),
  body('homeBase.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('lng phải là số từ -180 đến 180'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: errors.array() });
    }
    req.validatedData = matchedData(req, { locations: ['body'] });
    next();
  }
];

exports.checkDroneExists = async (req, res, next) => {
  try {
    const { droneId } = req.params;
    const drone = await Drone.findOne({ droneId, isActive: true });
    if (!drone) {
      return res.status(404).json({ message: 'Drone không tồn tại hoặc đã bị vô hiệu hóa' });
    }
    req.drone = drone; // Gắn drone vào req để controller sử dụng nếu cần
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi kiểm tra drone' });
  }
};
