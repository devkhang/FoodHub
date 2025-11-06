const express = require("express");
const { body } = require("express-validator");

const itemController = require("../controllers/itemController");
const auth = require("../../../middleware/auth");
const Seller = require("../../accesscontrol/models/seller")

const router = express.Router();

router.post(
  "/create-item",
  auth.verifySeller,
  [
    body("title", "Title needs to be at least 4 characters long")
      .trim()
      .isLength({ min: 4 }),
    body("description", "Description cannot be empty").trim().not().isEmpty(),
    body("price", "Price cannot be empty").trim().not().isEmpty(),
  ],
  itemController.createItem
);

router.delete(
  "/delete-item/:itemId",
  auth.verifySeller,
  itemController.deleteItem
);

router.put(
  "/edit-item/:itemId",
  auth.verifySeller,
  [
    body("title", "Title needs to be at least 4 characters long")
      .trim()
      .isLength({ min: 4 }),
    body("description", "Description cannot be empty").trim().not().isEmpty(),
    body("price", "Price cannot be empty").trim().not().isEmpty(),
  ],
  itemController.editItem
);

router.get("/get-items", auth.verifySeller, itemController.getItems);

router.get("/get-item/:itemId", auth.verifySeller, itemController.getItem);

router.get('/getAllInfo', async (req, res) => {
  try {
    const sellers = await Seller.find({})
      .select('name formattedAddress account') // chỉ lấy cần thiết
      .populate('account', 'email'); // lấy email từ Account

    const result = sellers.map(s => ({
      name: s.name,
      email: s.account?.email || 'N/A', // phòng trường hợp không có account
      formattedAddress: s.formattedAddress,
    }));

    res.json({
      success: true,
      sellers: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
