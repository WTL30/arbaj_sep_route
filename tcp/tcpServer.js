const net = require("net");
require("dotenv").config();
const { CabsDetails } = require("../models");
const { getBroadcastGPS } = require("../websocket");

const TCP_PORT = parseInt(process.env.GPS_TCP_PORT || "4000", 10);
const TCP_HOST = process.env.GPS_TCP_HOST || "0.0.0.0";

const verifiedIMEIs = new Set();
// Track last seen activity for each IMEI for debugging/observability
const lastSeen = new Map(); // imei -> { time, addr, port, lat, lon, speed }

console.log("🚦 Starting TCP Server...");

// Helper functions
function decodeIMEI(imeiHex) {
  return imeiHex.replace(/^0+/, "");
}

function calculateCRC(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc;
}

function createACK(protocol, serialNumber) {
  const startBit = "7878";
  const contentLength = "05";
  const dataHex = contentLength + protocol + serialNumber;
  const dataBuffer = Buffer.from(dataHex, "hex");
  const crc = calculateCRC(dataBuffer);
  const crcHex = crc.toString(16).padStart(4, "0").toUpperCase();
  const endBit = "0D0A";
  const ackPacket = startBit + contentLength + protocol + serialNumber + crcHex + endBit;
  console.log(`📦 Calculated ACK: ${ackPacket}`);
  return ackPacket;
}

function sendConfigCommand(socket, command, description) {
  console.log(`📤 Sending ${description}:`, command);
  socket.write(Buffer.from(command, 'hex'));
}

function configureGPSDevice(socket) {
  console.log("🔧 Configuring GPS device for 10-second intervals...");
  setTimeout(() => {
    const intervalCommand = "787810800C0000000A000000000000004E200D0A"; 
    sendConfigCommand(socket, intervalCommand, "10-second interval configuration");
  }, 1000);
  
  setTimeout(() => {
    const enableCommand = "787808800100010001D9DC0D0A";
    sendConfigCommand(socket, enableCommand, "continuous GPS reporting");
  }, 2000);
}

// Create TCP Server
const tcpServer = net.createServer((socket) => {
  const { remoteAddress, remotePort } = socket;
  console.log(`📡 New GPS device connected from ${remoteAddress}:${remotePort}`);
  let deviceIMEI = null;

  socket.on("data", async (data) => {
    try {
      const hex = data.toString("hex").toUpperCase();
      const raw = data.toString().trim();

      // Allow manual JSON testing
      if (raw.startsWith("{") && raw.endsWith("}")) {
        const parsed = JSON.parse(raw);
        if (parsed.imei && parsed.lat && parsed.lng) {
          console.log(`🧪 Manual JSON GPS -> IMEI: ${parsed.imei} lat:${parsed.lat} lng:${parsed.lng} speed:${parsed.speed ?? 0}`);
          getBroadcastGPS()(
            parsed.imei,
            parsed.lat,
            parsed.lng,
            parsed.ignition || false,
            parsed.speed || 0
          );
          console.log(`✅ Broadcasted manual GPS: ${parsed.imei}`);
          lastSeen.set(parsed.imei, {
            time: new Date().toISOString(),
            addr: remoteAddress,
            port: remotePort,
            lat: Number(parsed.lat),
            lon: Number(parsed.lng),
            speed: Number(parsed.speed || 0),
          });
        }
        socket.write("ACK: JSON received\n");
        return;
      }

      if (!hex.startsWith("7878")) return;
      const protocol = hex.substr(6, 2);

      // Login Packet
      if (protocol === "01") {
        const imeiHex = hex.substring(8, 24);
        const imei = decodeIMEI(imeiHex);
        deviceIMEI = imei;
        console.log(`🔑 Login IMEI: ${imei} from ${remoteAddress}:${remotePort}`);
        const cab = await CabsDetails.findOne({ where: { imei } });
        if (cab) {
          verifiedIMEIs.add(imei);
          console.log(`✅ IMEI ${imei} verified against DB (Cab ID: ${cab.id}, Cab No: ${cab.cabNumber || 'N/A'})`);
        } else {
          console.warn(`⚠️ IMEI ${imei} not found in CabsDetails table. Will still accept GPS, but mark as unverified.`);
        }
        const serialNumber = hex.substring(24, 28);
        const ack = createACK("01", serialNumber);
        socket.write(Buffer.from(ack, "hex"));
        lastSeen.set(imei, { time: new Date().toISOString(), addr: remoteAddress, port: remotePort });
      }

      // Heartbeat
      else if (protocol === "13") {
        const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
        socket.write(Buffer.from(createACK("13", serialNumber), "hex"));
        if (deviceIMEI) {
          lastSeen.set(deviceIMEI, { ...(lastSeen.get(deviceIMEI) || {}), time: new Date().toISOString(), addr: remoteAddress, port: remotePort });
          console.log(`💓 Heartbeat from IMEI ${deviceIMEI} @ ${remoteAddress}:${remotePort}`);
        } else {
          console.warn(`💓 Heartbeat received before login from ${remoteAddress}:${remotePort}`);
        }
      }

      // GPS Data
      else if (protocol === "22") {
        const latitudeHex = hex.substr(22, 8);
        const longitudeHex = hex.substr(30, 8);
        const speedHex = hex.substr(38, 2);
        const statusHex = hex.substr(44, 2);
        const serialNumber = hex.substring(hex.length - 8, hex.length - 4);

        const lat = parseInt(latitudeHex, 16) / 1800000;
        const lon = parseInt(longitudeHex, 16) / 1800000;
        const speed = parseInt(speedHex, 16);
        const ignition = (parseInt(statusHex, 16) & 0x08) !== 0 || speed > 2;
        if (!deviceIMEI) {
          console.warn(`📍 GPS packet received without prior login from ${remoteAddress}:${remotePort}. Proceeding but IMEI unknown.`);
        }
        const tag = deviceIMEI || 'UNKNOWN_IMEI';
        console.log(`📍 GPS IMEI:${tag} lat:${lat.toFixed(6)} lon:${lon.toFixed(6)} speed:${speed} ign:${ignition ? 'ON' : 'OFF'} from ${remoteAddress}:${remotePort}`);

        getBroadcastGPS()(tag, lat, lon, ignition, speed);

        socket.write(Buffer.from(createACK("22", serialNumber), "hex"));
        lastSeen.set(tag, { time: new Date().toISOString(), addr: remoteAddress, port: remotePort, lat, lon, speed });
      }
    } catch (err) {
      console.error("❌ Error parsing TCP:", err.message);
    }
  });

  socket.on("close", () => console.log(`🔌 GPS device disconnected from ${remoteAddress}:${remotePort} (IMEI:${deviceIMEI || 'unknown'})`));
  socket.on("error", (err) => console.error("⚠️ TCP socket error:", err.message));
});

// Export the server and start function
function startTcpServer() {
  if (tcpServer.listening) {
    console.log('⚠️ TCP Server is already running');
    return;
  }

  tcpServer.listen(TCP_PORT, TCP_HOST, () => {
    console.log(`🚀 TCP Server listening on ${TCP_HOST}:${TCP_PORT}`);
  });

  tcpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ TCP Port ${TCP_PORT} is already in use`);
    } else {
      console.error('❌ TCP Server error:', err);
    }
  });
}

module.exports = {
  startTcpServer
};
