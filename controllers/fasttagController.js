// controllers/fasttagController.js
const { getOperatorFromCyrus, rechargeFastagFromCyrus, } = require("../services/cyrusApi");

// helper: extract "Fastag" section robustly from Cyrus payload
function extractFastagOperators(payload) {
  // Cyrus payload can be nested; we'll search for the section named "Fastag"
  let sections = [];

  if (Array.isArray(payload)) {
    // look for common shapes in the array
    payload.forEach((item) => {
      if (Array.isArray(item?.data)) {
        // some items wrap an array of { ServiceTypeName, data }
        // flatten those
        item.data.forEach((section) => sections.push(section));
      }
      // or the item itself might already be a section
      if (item?.ServiceTypeName && Array.isArray(item?.data)) {
        sections.push(item);
      }
    });
  } else if (payload && Array.isArray(payload.data)) {
    sections = payload.data;
  }

  const fastagSection = sections.find(
    (s) => String(s.ServiceTypeName || "").toLowerCase() === "fastag"
  );

  const operators = Array.isArray(fastagSection?.data)
    ? fastagSection.data
    : [];

  // Normalize shape
  return operators.map((op) => ({
    operatorCode: op.OperatorCode,
    operatorName: op.OperatorName,
  }));
}

async function getFastagOperators(req, res, next) {
  try {
    const payload = await getOperatorFromCyrus();

    // If Cyrus returns an error array like [{ Status:"0", ErrorMessage: "...", Data:"[]" }]
    if (
      Array.isArray(payload) &&
      payload.length === 1 &&
      payload[0]?.Status === "0"
    ) {
      return res.status(400).json({
        success: false,
        message: payload[0]?.ErrorMessage || "Cyrus API error",
        raw: payload,
      });
    }

    const operators = extractFastagOperators(payload);

    return res.json({
      success: true,
      count: operators.length,
      operators,
    });
  } catch (err) {
    // common mistakes: IP not whitelisted, wrong creds, network timeouts
    console.error("GetOperator error:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch operators from Cyrus",
      details: err?.response?.data || err.message,
    });
  }
}

// OPTIONAL: raw passthrough for debugging (no parsing)
async function getOperatorsRaw(req, res) {
  try {
    const payload = await getOperatorFromCyrus();
    res.json(payload);
  } catch (err) {
    console.error("GetOperator RAW error:", err?.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch raw operators",
      details: err?.response?.data || err.message,
    });
  }
}

async function rechargeFastagGet(req, res) {
  try {
    const {
      number,         // Fastag/Vehicle/Wallet identifier
      operator,       // e.g. IFB-F, IND11008, HB-F
      amount,         // e.g. 1000
      circle = "1",   // For non-prepaid services keep 1; override if needed
      usertx,         // your unique transaction id
      format = "json",
      RechargeMode = "1",
      account,        // optional (BSNL/MTNL/Airtel broadband)
      othervalue,     // optional
      othervalue1,    // optional
    } = req.query;

    // minimal validation
    if (!number || !operator || !amount) {
      return res.status(400).json({
        success: false,
        message: "Required: number, operator, amount",
      });
    }

    // generate a fallback usertx if not sent (still recommend sending your own)
    const safeUsertx =
      usertx ||
      `FT${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`;

    // Build params exactly as Cyrus expects
    const params = {
      memberid: process.env.CYRUS_MEMBER_ID,
      pin: process.env.CYRUS_PIN,
      number,
      operator,
      circle,
      amount,
      usertx: safeUsertx,
      format,
      RechargeMode,
    };

    // include optional params only if provided
    if (account) params.account = account;
    if (othervalue) params.othervalue = othervalue;
    if (othervalue1) params.othervalue1 = othervalue1;

    const payload = await rechargeFastagFromCyrus(params);

    // Common failure shapes from Cyrus
    if (
      (Array.isArray(payload) && payload[0]?.Status === "0") ||
      payload?.Status === "FAILURE" ||
      payload?.Status === "FAILED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          payload?.ErrorMessage ||
          payload?.[0]?.ErrorMessage ||
          "Recharge failed",
        data: payload,
      });
    }

    return res.json({
      success: true,
      message: "Recharge request submitted",
      data: payload, // e.g. { ApiTransID, Status, ErrorMessage, OperatorRef, TransactionDate }
      usertx: safeUsertx,
    });
  } catch (err) {
    console.error("Recharge GET error:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to call Cyrus Recharge API",
      details: err?.response?.data || err.message,
    });
  }
}

module.exports = { getFastagOperators, getOperatorsRaw,rechargeFastagGet, };
