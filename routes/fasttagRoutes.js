// routes/fasttagRoutes.js
const express = require("express");
const router = express.Router();

const {
  getFastagOperators,
  getOperatorsRaw,
  rechargeFastagGet, 
} = require("../controllers/fasttagController");

router.get("/operators", getFastagOperators);
router.get("/operators/raw", getOperatorsRaw);
router.get("/recharge", rechargeFastagGet);

module.exports = router;
