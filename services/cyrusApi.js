// services/cyrusApi.js
const axios = require("axios");

const cyrus = axios.create({
  baseURL: process.env.CYRUS_BASE_URL,
  timeout: 15000,
});

async function getOperatorFromCyrus() {
  const params = {
    memberid: process.env.CYRUS_MEMBER_ID,
    pin: process.env.CYRUS_PIN,
    Method: "getoperator",
  };

  const { data } = await cyrus.get("/api/GetOperator.aspx", { params });
  return data;
}


async function rechargeFastagFromCyrus(params) {
  // Endpoint from docs: /services_cyapi/recharge_cyapi.aspx
  const { data } = await cyrus.get("/services_cyapi/recharge_cyapi.aspx", {
    params,
  });
  return data;
}

module.exports = { getOperatorFromCyrus,rechargeFastagFromCyrus };
