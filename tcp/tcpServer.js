/*GPS version 4 final (it will go for final-2)*/
const net = require("net");
require("dotenv").config();
const { CabsDetails } = require("../models");
const { getBroadcastGPS } = require("../websocket");

const TCP_PORT = parseInt(process.env.GPS_TCP_PORT || "4000", 10);
const TCP_HOST = process.env.GPS_TCP_HOST || "0.0.0.0"; // bind to all interfaces for VPS

const connectedClients = new Map();
const verifiedIMEIs = new Set();

console.log("Starting TCP Server...");

function decodeIMEI(imeiHex) {
  return imeiHex.replace(/^0+/, ""); // Remove leading zeros
}

// CRC-ITU calculation function
function calculateCRC(data) {
  let crc = 0xFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF; // Keep it 16-bit
    }
  }
  
  return crc;
}

// Function to decode GPS status and ignition from status byte
function decodeGPSStatus(statusHex) {
  const statusByte = parseInt(statusHex, 16);
  
  // Bit analysis for typical GPS tracker status byte
  const gpsFixed = (statusByte & 0x01) !== 0;          // Bit 0: GPS signal status
  const northSouth = (statusByte & 0x02) !== 0;        // Bit 1: N/S indicator
  const eastWest = (statusByte & 0x04) !== 0;          // Bit 2: E/W indicator
  const ignition = (statusByte & 0x08) !== 0;          // Bit 3: Ignition status (ACC)
  const charging = (statusByte & 0x10) !== 0;          // Bit 4: Charging status
  const alarm = (statusByte & 0x20) !== 0;             // Bit 5: Alarm status
  
  return {
    gpsFixed,
    northSouth,
    eastWest,
    ignition,
    charging,
    alarm,
    statusByte: statusByte.toString(2).padStart(8, '0') // Binary representation
  };
}

// Function to create proper ACK packet
function createACK(protocol, serialNumber) {
  const startBit = "7878";
  const contentLength = "05"; // Always 5 for ACK packets
  
  // Create the data part (without start bit and end bit)
  const dataHex = contentLength + protocol + serialNumber;
  const dataBuffer = Buffer.from(dataHex, 'hex');
  
  // Calculate CRC for the data part
  const crc = calculateCRC(dataBuffer);
  const crcHex = crc.toString(16).padStart(4, '0').toUpperCase();
  
  const endBit = "0D0A";
  
  // Construct complete ACK packet
  const ackPacket = startBit + contentLength + protocol + serialNumber + crcHex + endBit;
  
  console.log(`📦 Calculated ACK: ${ackPacket}`);
  console.log(`   - Protocol: ${protocol}`);
  console.log(`   - Serial: ${serialNumber}`);
  console.log(`   - CRC: ${crcHex}`);
  
  return ackPacket;
}

// Function to send configuration command to GPS device
function sendConfigCommand(socket, command, description) {
  console.log(`📤 Sending ${description}:`, command);
  socket.write(Buffer.from(command, 'hex'));
}

// Function to configure GPS device for 10-second intervals
function configureGPSDevice(socket) {
  console.log("🔧 Configuring GPS device for 10-second intervals...");
  
  // Send configuration commands with some delay between them
  setTimeout(() => {
    // Command to set upload interval to 10 seconds (example command - may vary by device)
    // This is a generic command - you may need to adjust based on your GPS device manual
    const intervalCommand = "787810800C0000000A000000000000004E200D0A"; 
    sendConfigCommand(socket, intervalCommand, "10-second interval configuration");
  }, 1000);
  
  setTimeout(() => {
    // Command to enable continuous GPS reporting
    const enableCommand = "787808800100010001D9DC0D0A";
    sendConfigCommand(socket, enableCommand, "continuous GPS reporting");
  }, 2000);
}

const server = net.createServer((socket) => {
  console.log("🔌 New GPS device connected");
  
  // Store device info for this connection
  let deviceIMEI = null;
  let lastGPSTime = Date.now();

  socket.on("data", async (data) => {
    try {
      console.log("data", data);
      const hex = data.toString("hex").toUpperCase();
      console.log("📡 Received raw data (hex):", hex);
      console.log("📡 Timestamp:", new Date().toISOString());

      if (!hex.startsWith("7878")) return;

      const protocol = hex.substr(6, 2);
      console.log("📦 Protocol:", protocol);
       
      if (protocol === "01") {
        // Protocol 01: Login
        const imeiHex = hex.substring(8, 24); // Extract IMEI from the hex
        console.log("imeiHex of GPS",imeiHex)
        const imei = decodeIMEI(imeiHex);
        const serialNumber = hex.substring(24, 28); // Extract serial number
        
        deviceIMEI = imei; // Store IMEI for this connection
        
        console.log("📲 IMEI Detected (login):", imei);
        console.log("🔢 Serial Number:", serialNumber);

        if (!verifiedIMEIs.has(imei)) {
         const cab = await CabsDetails.findOne({ where: { imei } });

    if (cab) {
      verifiedIMEIs.add(imei);
      console.log("✅ IMEI verified. Cab found:", cab.cabNumber);
    } else {
      console.log("❌ IMEI not found in CabDetails:", imei);
      // You might choose to close the socket or log only
    }
  } else {
    console.log("🔄 IMEI already verified:", imei);
  }

        // Create proper ACK for login (protocol 01)
        const ack = createACK("01", serialNumber);
        socket.write(Buffer.from(ack, "hex"));
        console.log("📨 Sent calculated ACK for protocol 01");
        
        // Configure GPS device after successful login
        setTimeout(() => {
          configureGPSDevice(socket);
        }, 3000);
      }

      else if (protocol === "13") {
        console.log("💓 Handling Protocol 13 (Heartbeat Packet)");
        
        // Extract serial number from heartbeat packet
        const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
        console.log("🔢 Heartbeat Serial Number:", serialNumber);
        
        // Create proper ACK for heartbeat (protocol 13)
        const ack = createACK("13", serialNumber);
        socket.write(Buffer.from(ack, "hex"));
        console.log("📨 Sent calculated ACK for protocol 13");
        
        // Log heartbeat frequency
        const now = Date.now();
        const timeSinceLastGPS = (now - lastGPSTime) / 1000;
        console.log(`⏱️  Time since last GPS data: ${timeSinceLastGPS.toFixed(1)}s`);
      }

      else if (protocol === "22") {
        console.log("🛰️  Handling Protocol 22 (GPS Data)");
        
        const currentTime = Date.now();
        const timeSinceLastGPS = (currentTime - lastGPSTime) / 1000;
        lastGPSTime = currentTime;
        
        console.log(`⏱️  GPS Data Interval: ${timeSinceLastGPS.toFixed(1)}s`);

        // Extract GPS data components
        const dateTimeHex = hex.substr(8, 12);   // Date and time
        const latitudeHex = hex.substr(22, 8);   // Extract latitude from hex
        const longitudeHex = hex.substr(30, 8);  // Extract longitude from hex
        const speedHex = hex.substr(38, 2);      // Extract speed from hex
        const courseHex = hex.substr(40, 4);     // Course/heading
        const statusHex = hex.substr(44, 2);     // Status byte (contains ignition info)
        
        // Extract serial number from correct position
        const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
        
        // Decode GPS status including ignition
        const gpsStatus = decodeGPSStatus(statusHex);
        
        // Convert coordinates and other values
        const lat = parseInt(latitudeHex, 16) / 1800000;  // Convert latitude from hex to decimal
        const lon = parseInt(longitudeHex, 16) / 1800000; // Convert longitude from hex to decimal
        const speed = parseInt(speedHex, 16); // Convert speed from hex
        const course = parseInt(courseHex, 16); // Convert course from hex
        
        // Logging the extracted values for debugging
        console.log("🔍 Hex Analysis:", {
          dateTimeHex,
          latitudeHex,
          longitudeHex,
          speedHex,
          courseHex,
          statusHex,
          serialNumber,
        });

        console.log("📍 GPS Data:");
        console.log("   📍 Latitude:", lat.toFixed(6));
        console.log("   📍 Longitude:", lon.toFixed(6));
        console.log("   🚗 Speed (km/h):", speed);
        console.log("   🧭 Course (degrees):", course);
        console.log("   🔢 Serial Number:", serialNumber);
        console.log("   📲 Device IMEI:", deviceIMEI);
        
        // IGNITION STATUS DETECTION
        console.log("🔌 Vehicle Status:");
        console.log("   🔥 IGNITION:", gpsStatus.ignition ? "🟢 ON" : "🔴 OFF");
        console.log("   🛰️  GPS Signal:", gpsStatus.gpsFixed ? "🟢 FIXED" : "🔴 NO SIGNAL");
        console.log("   🔋 Charging:", gpsStatus.charging ? "🟢 YES" : "🔴 NO");
        console.log("   🚨 Alarm:", gpsStatus.alarm ? "🔴 ACTIVE" : "🟢 NORMAL");
        console.log("   📊 Status Byte (Binary):", gpsStatus.statusByte);
        console.log("   📊 Status Byte (Hex):", statusHex);

        // Enhanced ignition detection with multiple methods
        let finalIgnitionStatus = false;
        
        // Method 1: Direct ignition bit from status byte
        if (gpsStatus.ignition) {
          finalIgnitionStatus = true;
          console.log("🔥 Ignition detected via STATUS BIT");
        }
        
        // Method 2: Fallback - movement detection
        if (!finalIgnitionStatus && speed > 2) {
          finalIgnitionStatus = true;
          console.log("🔥 Ignition detected via MOVEMENT (speed > 2 km/h)");
        }
        
        // Method 3: Another fallback - charging + GPS signal
        if (!finalIgnitionStatus && gpsStatus.charging && gpsStatus.gpsFixed) {
          console.log("🔥 Possible ignition via CHARGING + GPS SIGNAL");
        }
        
        console.log("🔥 FINAL IGNITION STATUS:", finalIgnitionStatus ? "🟢 ON" : "🔴 OFF");

        console.log(`📍 GPS from ${deviceIMEI}: ${lat}, ${lon} | Ignition: ${finalIgnitionStatus ? 'ON' : 'OFF'}`);
        getBroadcastGPS()(deviceIMEI, lat, lon, finalIgnitionStatus, speed);
        
        // Save GPS data to the database with proper ignition status
        if (deviceIMEI && lat !== 0 && lon !== 0) {
          // const saved = await GpsLocation.create({
          //   cabNumber: deviceIMEI,
          //   latitude: lat,
          //   longitude: lon,
          //   speed: speed,
          //   ignition: finalIgnitionStatus,  // Use properly detected ignition status
          //   course: course,
          //   gpsSignal: gpsStatus.gpsFixed,
          //   charging: gpsStatus.charging,
          //   alarm: gpsStatus.alarm,
          //   timestamp: new Date(),
          // });
          // console.log("✅ GPS data stored:", saved.id, `(${lat.toFixed(6)}, ${lon.toFixed(6)}) Ignition: ${finalIgnitionStatus ? 'ON' : 'OFF'}`);
          
          console.log("✅ GPS data would be stored with ignition status:", finalIgnitionStatus ? 'ON' : 'OFF');
        } else {
          console.log("⚠️  Skipping GPS save - invalid coordinates or missing IMEI");
        }

        // Create proper ACK for GPS data (protocol 22)
        const ack = createACK("22", serialNumber);
        socket.write(Buffer.from(ack, "hex"));
        console.log("📨 Sent calculated ACK for protocol 22");
      }

      else {
        console.warn("❓ Unknown or unsupported protocol:", parseInt(protocol, 16));
        console.log("📦 Raw Hex Data:", hex);
      }

    } catch (err) {
      console.error("❌ Error parsing TCP data:", err.message);
    }
  });

  socket.on("error", (err) => {
    console.error("❌ Socket error:", err);
  });

  socket.on("close", () => {
    console.log("🔌 GPS device disconnected");
  });
});

server.listen(TCP_PORT, TCP_HOST, () => {
  console.log(`🚀 TCP Server listening on ${TCP_HOST}:${TCP_PORT}`);
});
// const GpsLocation = require("../models/GpsLocation");
// const { Sequelize } = require("sequelize");

// console.log("Starting TCP Server...");

// function decodeIMEI(imeiHex) {
//   return imeiHex.replace(/^0+/, ""); // Remove leading zeros
// }

// // CRC-ITU calculation function
// function calculateCRC(data) {
//   let crc = 0xFFFF;
  
//   for (let i = 0; i < data.length; i++) {
//     crc ^= data[i] << 8;
    
//     for (let j = 0; j < 8; j++) {
//       if (crc & 0x8000) {
//         crc = (crc << 1) ^ 0x1021;
//       } else {
//         crc = crc << 1;
//       }
//       crc &= 0xFFFF; // Keep it 16-bit
//     }
//   }
  
//   return crc;
// }

// // Function to create proper ACK packet
// function createACK(protocol, serialNumber) {
//   const startBit = "7878";
//   const contentLength = "05"; // Always 5 for ACK packets
  
//   // Create the data part (without start bit and end bit)
//   const dataHex = contentLength + protocol + serialNumber;
//   const dataBuffer = Buffer.from(dataHex, 'hex');
  
//   // Calculate CRC for the data part
//   const crc = calculateCRC(dataBuffer);
//   const crcHex = crc.toString(16).padStart(4, '0').toUpperCase();
  
//   const endBit = "0D0A";
  
//   // Construct complete ACK packet
//   const ackPacket = startBit + contentLength + protocol + serialNumber + crcHex + endBit;
  
//   console.log(`📦 Calculated ACK: ${ackPacket}`);
//   console.log(`   - Protocol: ${protocol}`);
//   console.log(`   - Serial: ${serialNumber}`);
//   console.log(`   - CRC: ${crcHex}`);
  
//   return ackPacket;
// }

// // Function to send configuration command to GPS device
// function sendConfigCommand(socket, command, description) {
//   console.log(`📤 Sending ${description}:`, command);
//   socket.write(Buffer.from(command, 'hex'));
// }

// // REMOVED - Configuration function that was causing disconnections
// // The GPS device disconnects when receiving unknown commands

// const server = net.createServer((socket) => {
//   console.log("🔌 New GPS device connected");
  
//   // Store device info for this connection
//   let deviceIMEI = null;
//   let lastGPSTime = Date.now();

//   socket.on("data", async (data) => {
//     try {
//       console.log("data", data);
//       const hex = data.toString("hex").toUpperCase();
//       console.log("📡 Received raw data (hex):", hex);
//       console.log("📡 Timestamp:", new Date().toISOString());

//       if (!hex.startsWith("7878")) return;

//       const protocol = hex.substr(6, 2);
//       console.log("📦 Protocol:", protocol);
       
//       if (protocol === "01") {
//         // Protocol 01: Login
//         const imeiHex = hex.substring(8, 24); // Extract IMEI from the hex
//         const imei = decodeIMEI(imeiHex);
//         const serialNumber = hex.substring(24, 28); // Extract serial number
        
//         deviceIMEI = imei; // Store IMEI for this connection
        
//         console.log("📲 IMEI Detected (login):", imei);
//         console.log("🔢 Serial Number:", serialNumber);

//         // Save the login data (set latitude, longitude, speed to default 0)
//         const saved = await GpsLocation.create({
//           cabNumber: imei,  // Use the IMEI as the cabNumber
//           latitude: 0,
//           longitude: 0,
//           speed: 0,
//           ignition: false,
//         });

//         console.log("✅ GPS Data stored (login):", saved.id);

//         // Create proper ACK for login (protocol 01)
//         const ack = createACK("01", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//         console.log("📨 Sent calculated ACK for protocol 01");
        
//         // DO NOT send configuration commands - they cause disconnection
//         console.log("✅ Login successful - GPS device ready for data transmission");
//       }

//       else if (protocol === "13") {
//         console.log("❗ Protocol 13 (Heartbeat) - Keeping connection alive");
        
//         // Extract serial number from heartbeat packet
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
        
//         // Create proper ACK for heartbeat (protocol 13)
//         const ack = createACK("13", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//         console.log("📨 Heartbeat ACK sent - connection maintained");
        
//         // Log heartbeat frequency but don't treat as GPS data
//         const now = Date.now();
//         if (lastGPSTime > 0) {
//           const timeSinceLastGPS = (now - lastGPSTime) / 1000;
//           console.log(`⏱️  Time since last GPS data: ${timeSinceLastGPS.toFixed(1)}s`);
//         }
//       }

//       else if (protocol === "22") {
//         console.log("❗ Handling Protocol 22 (GPS Data)");
        
//         const currentTime = Date.now();
//         const timeSinceLastGPS = (currentTime - lastGPSTime) / 1000;
//         lastGPSTime = currentTime;
        
//         console.log(`⏱️  GPS Data Interval: ${timeSinceLastGPS.toFixed(1)}s`);

//         // Corrected hex extraction positions for your GPS device format
//         const latitudeHex = hex.substr(22, 8);  // Extract latitude from hex
//         const longitudeHex = hex.substr(30, 8); // Extract longitude from hex
//         const speedHex = hex.substr(38, 2);     // Extract speed from hex
        
//         // Extract serial number from correct position (different for each packet)
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4); // Extract serial number
        
//         // Logging the extracted values for debugging
//         console.log("Hex values:", {
//           latitudeHex,
//           longitudeHex,
//           speedHex,
//           serialNumber,
//         });

//         const lat = parseInt(latitudeHex, 16) / 1800000;  // Convert latitude from hex to decimal
//         const lon = parseInt(longitudeHex, 16) / 1800000; // Convert longitude from hex to decimal
//         const speed = parseInt(speedHex, 16); // Convert speed from hex

//         console.log("📍 Latitude:", lat);
//         console.log("📍 Longitude:", lon);
//         console.log("🚗 Speed (km/h):", speed);
//         console.log("📲 Device IMEI:", deviceIMEI);
//         console.log("🕐 GPS Update:", new Date().toLocaleTimeString());

//         // Save GPS data to the database - UNCOMMENTED FOR REAL DATA
//         if (deviceIMEI && lat !== 0 && lon !== 0) {
//           const saved = await GpsLocation.create({
//             cabNumber: deviceIMEI,  // Use stored IMEI
//             latitude: lat,     // Store latitude
//             longitude: lon,   // Store longitude
//             speed: speed,     // Store speed
//             ignition: speed > 0,  // Simple ignition detection based on speed
//             timestamp: new Date(), // Add explicit timestamp
//           });
//           console.log("✅ GPS DATA SAVED:", saved.id, `(${lat.toFixed(6)}, ${lon.toFixed(6)})`);
//         } else {
//           console.log("⚠️  Skipping GPS save - invalid coordinates or missing IMEI");
//         }

//         // Create proper ACK for GPS data (protocol 22)
//         const ack = createACK("22", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//         console.log("📨 Sent calculated ACK for protocol 22");
//       }

//       else {
//         console.warn("❗ Unknown protocol:", parseInt(protocol, 16));
        
//         // Handle the 7979 packets (might be status or configuration response)
//         if (hex.startsWith("7979")) {
//           console.log("📦 Status packet (7979) - ignoring");
//           return; // Don't process 7979 packets
//         }
        
//         console.log("📦 Raw Hex Data:", hex);
//       }

//     } catch (err) {
//       console.error("❌ Error parsing TCP data:", err.message);
//     }
//   });

//   socket.on("error", (err) => {
//     console.error("❌ Socket error:", err.message);
//   });

//   socket.on("close", () => {
//     console.log("🔌 GPS device disconnected - IMEI:", deviceIMEI || "Unknown");
//     console.log("🔄 Device will reconnect automatically...");
//   });

//   // Keep connection alive
//   socket.setKeepAlive(true, 30000); // 30 seconds keep-alive
//   socket.setTimeout(60000); // 60 seconds timeout
  
//   socket.on('timeout', () => {
//     console.log('⚠️  Socket timeout - closing connection');
//     socket.destroy();
//   });
// });

// server.listen(5000, () => {
//   console.log("🚀 TCP Server listening on port 5000");
// });


/**only can  see Gps tracking version 1 */
// const net = require("net");
// const GpsLocation = require("../models/GpsLocation");
// const { Sequelize } = require("sequelize");

// console.log("Starting TCP Server...");

// function decodeIMEI(imeiHex) {
//   return imeiHex.replace(/^0+/, ""); // Remove leading zeros
// }

// function calculateCRC(data) {
//   let crc = 0xFFFF;
  
//   for (let i = 0; i < data.length; i++) {
//     crc ^= data[i] << 8;
    
//     for (let j = 0; j < 8; j++) {
//       if (crc & 0x8000) {
//         crc = (crc << 1) ^ 0x1021;
//       } else {
//         crc = crc << 1;
//       }
//       crc &= 0xFFFF;
//     }
//   }
  
//   return crc;
// }

// // Function to create proper ACK packet
// function createACK(protocol, serialNumber) {
//   const startBit = "7878";
//   const contentLength = "05";
//   const dataHex = contentLength + protocol + serialNumber;
//   const dataBuffer = Buffer.from(dataHex, 'hex');
//   const crc = calculateCRC(dataBuffer);
//   const crcHex = crc.toString(16).padStart(4, '0').toUpperCase();
//   const endBit = "0D0A";
//   const ackPacket = startBit + contentLength + protocol + serialNumber + crcHex + endBit;
//   return ackPacket;
// }

// const server = net.createServer((socket) => {
//   // Store device info for this connection
//   let deviceIMEI = null;
//   let lastGPSTime = Date.now();

//   socket.on("data", async (data) => {
//     try {
//       const hex = data.toString("hex").toUpperCase();

//       if (!hex.startsWith("7878")) return;

//       const protocol = hex.substr(6, 2);
       
//       if (protocol === "01") {
//         // Protocol 01: Login - SILENT PROCESSING
//         const imeiHex = hex.substring(8, 24);
//         const imei = decodeIMEI(imeiHex);
//         const serialNumber = hex.substring(24, 28);
        
//         deviceIMEI = imei; // Store IMEI for this connection
        
//         // Save login data
//         // await GpsLocation.create({
//         //   cabNumber: imei,
//         //   latitude: 0,
//         //   longitude: 0,
//         //   speed: 0,
//         //   ignition: false,
//         // });

//         // Send ACK
//         const ack = createACK("01", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//       }

//       else if (protocol === "13") {
//         // Protocol 13: Heartbeat - SILENT PROCESSING
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
//         const ack = createACK("13", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//       }

//       else if (protocol === "22") {
//         // ============= GPS DATA - ONLY THIS WILL BE SHOWN =============
        
//         const currentTime = Date.now();
//         const timeSinceLastGPS = (currentTime - lastGPSTime) / 1000;
//         lastGPSTime = currentTime;

//         // Extract GPS coordinates
//         const latitudeHex = hex.substr(22, 8);
//         const longitudeHex = hex.substr(30, 8);
//         const speedHex = hex.substr(38, 2);
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4);

//         const lat = parseInt(latitudeHex, 16) / 1800000;
//         const lon = parseInt(longitudeHex, 16) / 1800000;
//         const speed = parseInt(speedHex, 16);

//         // ========== ONLY SHOW GPS DATA ==========
//         console.log("==============================================");
//         console.log("🚗 GPS TRACKING DATA");
//         console.log("📲 Vehicle ID:", deviceIMEI);
//         console.log("📍 Location:", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
//         console.log("🏎️  Speed:", speed, "km/h");
//         console.log("🕐 Time:", new Date().toLocaleString());
//         console.log("⏱️  Update Interval:", `${timeSinceLastGPS.toFixed(1)}s`);
//         console.log("==============================================");

//         // Save GPS data to database
//         if (deviceIMEI && lat !== 0 && lon !== 0) {
//           // const saved = await GpsLocation.create({
//           //   cabNumber: deviceIMEI,
//           //   latitude: lat,
//           //   longitude: lon,
//           //   speed: speed,
//           //   ignition: speed > 0,
//           //   timestamp: new Date(),
//           // });
//           // console.log("✅ SAVED TO DATABASE - ID:", saved.id);
//         }

//         // Send ACK
//         const ack = createACK("22", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//       }

//       else {
//         // Handle unknown protocols silently
//         if (hex.startsWith("7979")) {
//           return; // Ignore status packets
//         }
//       }

//     } catch (err) {
//       console.error("❌ GPS Error:", err.message);
//     }
//   });

//   socket.on("error", (err) => {
//     // Silent error handling
//   });

//   socket.on("close", () => {
//     // Silent disconnect handling
//   });

//   // Keep connection alive
//   socket.setKeepAlive(true, 30000);
//   socket.setTimeout(60000);
  
//   socket.on('timeout', () => {
//     socket.destroy();
//   });
// });

// console.log("🚀 GPS TRACKER SERVER STARTED ON PORT 5000");
// console.log("📡 Waiting for GPS devices...");
// console.log("=====================================");

// server.listen(5000, () => {
//  console.log("server is running on")
// });



// const net = require("net");
// const GpsLocation = require("../models/GpsLocation");
// const { Sequelize } = require("sequelize");

// console.log("Starting TCP Server...");

// function decodeIMEI(imeiHex) {
//   return imeiHex.replace(/^0+/, ""); // Remove leading zeros
// }

// function calculateCRC(data) {
//   let crc = 0xFFFF;
  
//   for (let i = 0; i < data.length; i++) {
//     crc ^= data[i] << 8;
    
//     for (let j = 0; j < 8; j++) {
//       if (crc & 0x8000) {
//         crc = (crc << 1) ^ 0x1021;
//       } else {
//         crc = crc << 1;
//       }
//       crc &= 0xFFFF;
//     }
//   }
  
//   return crc;
// }

// // Function to create proper ACK packet
// function createACK(protocol, serialNumber) {
//   const startBit = "7878";
//   const contentLength = "05";
//   const dataHex = contentLength + protocol + serialNumber;
//   const dataBuffer = Buffer.from(dataHex, 'hex');
//   const crc = calculateCRC(dataBuffer);
//   const crcHex = crc.toString(16).padStart(4, '0').toUpperCase();
//   const endBit = "0D0A";
//   const ackPacket = startBit + contentLength + protocol + serialNumber + crcHex + endBit;
//   return ackPacket;
// }

// const server = net.createServer((socket) => {
//   // Store device info for this connection
//   let deviceIMEI = null;
//   let lastGPSTime = Date.now();
//   let connectionTime = new Date();

//   console.log("🔌 GPS Device Connected at", connectionTime.toLocaleTimeString());

//   socket.on("data", async (data) => {
//     try {
//       const hex = data.toString("hex").toUpperCase();

//       if (!hex.startsWith("7878")) return;

//       const protocol = hex.substr(6, 2);
       
//       if (protocol === "01") {
//         // Protocol 01: Login - SILENT PROCESSING
//         const imeiHex = hex.substring(8, 24);
//         const imei = decodeIMEI(imeiHex);
//         const serialNumber = hex.substring(24, 28);
        
//         deviceIMEI = imei; // Store IMEI for this connection
        
//         console.log("📲 Vehicle logged in:", imei);
        
//         // Save login data
//         // await GpsLocation.create({
//         //   cabNumber: imei,
//         //   latitude: 0,
//         //   longitude: 0,
//         //   speed: 0,
//         //   ignition: false,
//         // });

//         // Send ACK
//         const ack = createACK("01", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//         console.log("✅ Login ACK sent - waiting for GPS data...");
//       }

//       else if (protocol === "13") {
//         // Protocol 13: Heartbeat - SILENT PROCESSING
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4);
//         const ack = createACK("13", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
        
//         // Show heartbeat to know device is alive
//         const now = Date.now();
//         if (lastGPSTime > 0) {
//           const timeSinceLastGPS = (now - lastGPSTime) / 1000;
//           console.log(`Device alive - ${timeSinceLastGPS.toFixed(0)}s since last GPS`);
//         }
//       }

//       else if (protocol === "22") {
//         // ============= GPS DATA - ONLY THIS WILL BE SHOWN =============
        
//         const currentTime = Date.now();
//         const timeSinceLastGPS = (currentTime - lastGPSTime) / 1000;
//         lastGPSTime = currentTime;

//         // Extract GPS coordinates
//         const latitudeHex = hex.substr(22, 8);
//         const longitudeHex = hex.substr(30, 8);
//         const speedHex = hex.substr(38, 2);
//         const serialNumber = hex.substring(hex.length - 8, hex.length - 4);

//         const lat = parseInt(latitudeHex, 16) / 1800000;
//         const lon = parseInt(longitudeHex, 16) / 1800000;
//         const speed = parseInt(speedHex, 16);

//         // ========== ONLY SHOW GPS DATA ==========
//         console.log("==============================================");
//         console.log("🚗 GPS TRACKING DATA");
//         console.log("📲 Vehicle ID:", deviceIMEI);
//         console.log("📍 Location:", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
//         console.log("🏎️  Speed:", speed, "km/h");
//         console.log("🕐 Time:", new Date().toLocaleString());
//         console.log("⏱️  Update Interval:", `${timeSinceLastGPS.toFixed(1)}s`);
//         console.log("==============================================");

//         // Save GPS data to database
//         if (deviceIMEI && lat !== 0 && lon !== 0) {
//           // const saved = await GpsLocation.create({
//           //   cabNumber: deviceIMEI,
//           //   latitude: lat,
//           //   longitude: lon,
//           //   speed: speed,
//           //   ignition: speed > 0,
//           //   timestamp: new Date(),
//           // });
//           // console.log("✅ SAVED TO DATABASE - ID:", saved.id);
//         }

//         // Send ACK - CRITICAL FOR CONTINUOUS DATA
//         const ack = createACK("22", serialNumber);
//         socket.write(Buffer.from(ack, "hex"));
//         console.log("📤 GPS ACK sent - waiting for next update...");
//       }

//       else {
//         // Handle unknown protocols silently
//         if (hex.startsWith("7979")) {
//           return; // Ignore status packets
//         }
//         console.log("❓ Unknown packet received");
//       }

//     } catch (err) {
//       console.error("❌ GPS Error:", err.message);
//     }
//   });

//   socket.on("error", (err) => {
//     console.log("❌ Connection error - device will reconnect");
//   });

//   socket.on("close", () => {
//     console.log("🔌 Device disconnected - waiting for reconnection...");
//   });

//   // Keep connection alive - IMPORTANT FOR CONTINUOUS GPS
//   socket.setKeepAlive(true, 30000);
//   socket.setTimeout(120000); // Increased timeout to 2 minutes
  
//   socket.on('timeout', () => {
//     console.log('⏰ Connection timeout - device will reconnect');
//     socket.destroy();
//   });
// });

// console.log("🚀 GPS TRACKER SERVER STARTED ON PORT 5000");
// console.log("📡 Waiting for GPS devices...");
// console.log("=====================================");

// server.listen(5000, () => {
//   // Silent server start
// });



// const net = require("net");
// const GpsLocation = require("../models/GpsLocation");
// const { Sequelize } = require("sequelize");

// console.log("Starting GPS Server with Correct CRC...");

// function decodeIMEI(imeiHex) {
//   return imeiHex.replace(/^0+/, ""); // Remove leading zeros
// }

// // CORRECT CRC-16 calculation using lookup table method from your documentation
// function calculateCRC16(data) {
//   // CRC-16 lookup table (partial - you can add full table from your documentation)
//   const crcTable = [
//     0x0000, 0x1189, 0x2312, 0x329B, 0x4624, 0x57AD, 0x6536, 0x74BF,
//     0x8C48, 0x9DC1, 0xAF5A, 0xBED3, 0xCA6C, 0xDBE5, 0xE97E, 0xF8F7,
//     0x1081, 0x0108, 0x3393, 0x221A, 0x56A5, 0x472C, 0x65B7, 0x743E,
//     0x9CC9, 0x8D40, 0xBFDB, 0xAE52, 0xDAED, 0xCB64, 0xF9FF, 0xE876,
//     0x2102, 0x308B, 0x0210, 0x1399, 0x6726, 0x76AF, 0x4434, 0x55BD,
//     0xAD4A, 0xBCC3, 0x8E58, 0x9FD1, 0xEB6E, 0xFAE7, 0xC87C, 0xD9F5,
//     0x3183, 0x200A, 0x1291, 0x0318, 0x77A7, 0x662E, 0x54B5, 0x453C,
//     0xBDCB, 0xAC42, 0x9ED9, 0x8F50, 0xFBEF, 0xEA66, 0xD8FD, 0xC974
//   ];
  
//   let crc = 0xFFFF;
  
//   for (let i = 0; i < data.length; i++) {
//     const tblIdx = ((crc >> 8) ^ data[i]) & 0xFF;
//     crc = ((crc << 8) ^ crcTable[tblIdx]) & 0xFFFF;
//   }
  
//   return crc;
// }

// // Function to create proper ACK packet EXACTLY as per documentation
// function createACK(protocol, serialNumber) {
//   // ACK packet structure: 78 78 05 01 00 02 EB 47 0D 0A
//   // Start: 78 78
//   // Length: 05
//   // Protocol: 01 (for login ACK)
//   // Data: 00 02 (fixed data for ACK)
//   // CRC: EB 47 (calculated)
//   // End: 0D 0A
  
//   const startBits = [0x78, 0x78];
//   const length = [0x05];
//   const protocolByte = [parseInt(protocol, 16)];
//   const ackData = [0x00, parseInt(serialNumber.substring(2, 4), 16)]; // Use last byte of serial
  
//   // Data for CRC calculation (length + protocol + ack data)
//   const dataForCRC = Buffer.from([...length, ...protocolByte, ...ackData]);
  
//   // Calculate CRC using the lookup table method from documentation
//   const crc = calculateCRC16(dataForCRC);
//   const crcHigh = (crc >> 8) & 0xFF;
//   const crcLow = crc & 0xFF;
  
//   const endBits = [0x0D, 0x0A];
  
//   // Complete ACK packet
//   const ackPacket = Buffer.from([
//     ...startBits,
//     ...length,
//     ...protocolByte,
//     ...ackData,
//     crcHigh,
//     crcLow,
//     ...endBits
//   ]);
  
//   return ackPacket;
// }

// // Function to parse GPS data packet
// function parseGPSData(hex) {
//   try {
//     // GPS packet structure based on your documentation
//     const dateTime = hex.substr(8, 12); // Date and time
//     const gpsInfoLength = parseInt(hex.substr(20, 2), 16);
//     const latitude = parseInt(hex.substr(22, 8), 16) / 1800000;
//     const longitude = parseInt(hex.substr(30, 8), 16) / 1800000;
//     const speed = parseInt(hex.substr(38, 2), 16);
//     const course = parseInt(hex.substr(40, 4), 16);
    
//     return {
//       dateTime,
//       latitude,
//       longitude,
//       speed,
//       course,
//       gpsInfoLength
//     };
//   } catch (error) {
//     console.error("❌ GPS parsing error:", error.message);
//     return null;
//   }
// }

// const server = net.createServer((socket) => {
//   let deviceIMEI = null;
//   let lastGPSTime = 0;
//   let connectionTime = new Date();

//   console.log("🔌 GPS Device Connected at", connectionTime.toLocaleTimeString());

//   socket.on("data", async (data) => {
//     try {
//       const hex = data.toString("hex").toUpperCase();
//       console.log("📥 Received:", hex);

//       // Check if it's a valid GPS packet (7878 or 7979)
//       if (!hex.startsWith("7878") && !hex.startsWith("7979")) {
//         console.log("⚠️ Invalid packet start - not 7878 or 7979");
//         return;
//       }

//       // Determine packet type by start bits
//       const isLocationPacket = hex.startsWith("7979");
//       const isCommandPacket = hex.startsWith("7878");

//       // Extract packet info based on packet type
//       let contentLength, protocol, serialNumber;
      
//       if (isLocationPacket) {
//         // 7979 packets - GPS location data
//         contentLength = parseInt(hex.substr(4, 2), 16);
//         protocol = "GPS"; // This is GPS data
//         serialNumber = hex.substr(hex.length - 8, 4);
//         console.log(`📋 GPS Location Packet - Length: ${contentLength}, Serial: ${serialNumber}`);
//       } else {
//         // 7878 packets - Commands/heartbeat
//         contentLength = parseInt(hex.substr(4, 2), 16);
//         protocol = hex.substr(6, 2);
//         serialNumber = hex.substr(hex.length - 8, 4);
//         console.log(`📋 Protocol: ${protocol}, Length: ${contentLength}, Serial: ${serialNumber}`);
//       }

//       if (isLocationPacket) {
//         // ============= GPS LOCATION PACKET (7979) =============
//         const currentTime = Date.now();
//         const timeSinceLastGPS = lastGPSTime > 0 ? (currentTime - lastGPSTime) / 1000 : 0;
//         lastGPSTime = currentTime;
        
//         console.log("🛰️ GPS Location Packet (7979) Received!");
        
//         try {
//           // Parse the 7979 GPS packet structure
//           // Format: 7979 + Length + GPS Data + Serial + CRC + 0D0A
//           const imeiHex = hex.substr(8, 16); // IMEI position in 7979 packets
//           const imei = decodeIMEI(imeiHex);
          
//           // Extract GPS coordinates (adjust positions for 7979 format)
//           const latHex = hex.substr(32, 8);
//           const lonHex = hex.substr(40, 8);
//           const speedHex = hex.substr(48, 4);
          
//           const latitude = parseInt(latHex, 16) / 1800000;
//           const longitude = parseInt(lonHex, 16) / 1800000;
//           const speed = parseInt(speedHex, 16);
          
//           console.log("==============================================");
//           console.log("🚗 LIVE GPS TRACKING (7979 FORMAT)");
//           console.log("📲 Vehicle ID:", imei || deviceIMEI);
//           console.log("📍 Latitude:", latitude.toFixed(6));
//           console.log("📍 Longitude:", longitude.toFixed(6));
//           console.log("🏎️  Speed:", speed, "km/h");
//           console.log("🕐 Time:", new Date().toLocaleString());
          
//           if (timeSinceLastGPS > 0) {
//             console.log("⏱️  Update Interval:", `${timeSinceLastGPS.toFixed(1)}s`);
            
//             if (timeSinceLastGPS <= 5) {
//               console.log("🟢 STATUS: REAL-TIME TRACKING");
//             } else if (timeSinceLastGPS <= 30) {
//               console.log("🟡 STATUS: REGULAR TRACKING");
//             } else {
//               console.log("🔴 STATUS: SLOW TRACKING");
//             }
//           }
//           console.log("==============================================");
          
//           // Save to database
//           if ((imei || deviceIMEI) && latitude !== 0 && longitude !== 0) {
//             try {
//               const saved = await GpsLocation.create({
//                 cabNumber: imei || deviceIMEI,
//                 latitude: latitude,
//                 longitude: longitude,
//                 speed: speed,
//                 ignition: speed > 0,
//                 timestamp: new Date(),
//               });
//               console.log("✅ SAVED TO DATABASE - ID:", saved.id);
//             } catch (dbError) {
//               console.log("⚠️ Database error:", dbError.message);
//             }
//           }
          
//           // Send ACK for 7979 packets (different format)
//           const ack7979 = Buffer.from([0x79, 0x79, 0x00, 0x05, 0x01, 
//             parseInt(serialNumber.substring(0, 2), 16),
//             parseInt(serialNumber.substring(2, 4), 16),
//             0x00, 0x00, 0x0D, 0x0A]);
//           socket.write(ack7979);
          
//           console.log("✅ GPS ACK (7979) sent:", ack7979.toString('hex').toUpperCase());
//           console.log("🔄 Ready for next GPS update...");
          
//         } catch (parseError) {
//           console.error("❌ GPS parsing error:", parseError.message);
//           console.log("📦 Raw GPS packet:", hex);
//         }
//       }
      
//       else if (protocol === "01") {
//         // ============= LOGIN PACKET =============
//         console.log("🔐 Processing Login Packet...");
        
//         // Extract IMEI (8 bytes after protocol) - exact position from your docs
//         const imeiHex = hex.substring(8, 24);
//         const imei = decodeIMEI(imeiHex);
//         deviceIMEI = imei;
        
//         console.log("📲 Vehicle IMEI:", imei);
//         console.log("🔢 Serial Number:", serialNumber);
//         console.log("📋 Full Login Packet:", hex);
        
//         // Create ACK exactly as shown in your documentation
//         // Expected: 78 78 05 01 00 02 EB 47 0D 0A
//         const ackPacket = createACK("01", serialNumber);
//         socket.write(ackPacket);
        
//         const expectedACK = "787805010002EB470D0A"; // From your documentation
//         const actualACK = ackPacket.toString('hex').toUpperCase();
        
//         console.log("✅ Login ACK sent:", actualACK);
//         console.log("📖 Expected ACK:", expectedACK);
//         console.log("🎯 ACK Match:", actualACK === expectedACK ? "✅ PERFECT!" : "❌ Different");
//         console.log("🎯 Waiting for GPS data...");
//       }
      
//       else if (protocol === "13") {
//         // ============= HEARTBEAT PACKET =============
//         console.log("💓 Heartbeat received");
        
//         // Send heartbeat ACK
//         const ackPacket = createACK("13", serialNumber);
//         socket.write(ackPacket);
        
//         console.log("✅ Heartbeat ACK sent:", ackPacket.toString('hex').toUpperCase());
        
//         // Show time since last GPS
//         if (lastGPSTime > 0) {
//           const timeSinceGPS = (Date.now() - lastGPSTime) / 1000;
//           console.log(`⏰ ${timeSinceGPS.toFixed(0)}s since last GPS data`);
//         }
//       }
      
//       else if (protocol === "22" || protocol === "12") {
//         // ============= GPS DATA PACKET =============
//         const currentTime = Date.now();
//         const timeSinceLastGPS = lastGPSTime > 0 ? (currentTime - lastGPSTime) / 1000 : 0;
//         lastGPSTime = currentTime;
        
//         console.log("🛰️ GPS Data Packet Received!");
        
//         // Parse GPS data
//         const gpsData = parseGPSData(hex);
        
//         if (gpsData) {
//           console.log("==============================================");
//           console.log("🚗 LIVE GPS TRACKING");
//           console.log("📲 Vehicle ID:", deviceIMEI);
//           console.log("📍 Latitude:", gpsData.latitude.toFixed(6));
//           console.log("📍 Longitude:", gpsData.longitude.toFixed(6));
//           console.log("🏎️  Speed:", gpsData.speed, "km/h");
//           console.log("🧭 Course:", gpsData.course, "degrees");
//           console.log("🕐 Time:", new Date().toLocaleString());
          
//           if (timeSinceLastGPS > 0) {
//             console.log("⏱️  Update Interval:", `${timeSinceLastGPS.toFixed(1)}s`);
            
//             if (timeSinceLastGPS <= 5) {
//               console.log("🟢 STATUS: REAL-TIME TRACKING");
//             } else if (timeSinceLastGPS <= 30) {
//               console.log("🟡 STATUS: REGULAR TRACKING");
//             } else {
//               console.log("🔴 STATUS: SLOW TRACKING");
//             }
//           }
//           console.log("==============================================");
          
//           // Save to database
//           if (deviceIMEI && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
//             try {
//               const saved = await GpsLocation.create({
//                 cabNumber: deviceIMEI,
//                 latitude: gpsData.latitude,
//                 longitude: gpsData.longitude,
//                 speed: gpsData.speed,
//                 ignition: gpsData.speed > 0,
//                 timestamp: new Date(),
//               });
//               console.log("✅ SAVED TO DATABASE - ID:", saved.id);
//             } catch (dbError) {
//               console.log("⚠️ Database error:", dbError.message);
//             }
//           }
//         }
        
//         // Send GPS ACK - CRITICAL!
//         const ackPacket = createACK(protocol, serialNumber);
//         socket.write(ackPacket);
        
//         console.log("✅ GPS ACK sent:", ackPacket.toString('hex').toUpperCase());
//         console.log("🔄 Ready for next GPS update...");
//       }
      
//       else {
//         // ============= OTHER PACKETS =============
//         console.log(`❓ Unknown protocol ${protocol} - attempting ACK`);
        
//         // Try to send ACK for unknown protocols too
//         try {
//           const ackPacket = createACK(protocol, serialNumber);
//           socket.write(ackPacket);
//           console.log("✅ Generic ACK sent for protocol:", protocol);
//         } catch (ackError) {
//           console.log("❌ Could not send ACK for protocol:", protocol);
//         }
//       }

//     } catch (err) {
//       console.error("❌ Packet processing error:", err.message);
//       console.error("📦 Raw packet:", data.toString("hex").toUpperCase());
//     }
//   });

//   socket.on("error", (err) => {
//     console.log("❌ Socket error:", err.message);
//   });

//   socket.on("close", () => {
//     const duration = (Date.now() - connectionTime.getTime()) / 1000;
//     console.log("🔌 Device disconnected");
//     console.log(`📊 Session: ${duration.toFixed(0)}s duration`);
//     if (lastGPSTime > 0) {
//       console.log(`📍 Last GPS: ${((Date.now() - lastGPSTime) / 1000).toFixed(0)}s ago`);
//     }
//   });

//   // Connection settings optimized for GPS tracking
//   socket.setKeepAlive(true, 30000);
//   socket.setTimeout(300000); // 5 minutes
//   socket.setNoDelay(true); // Fast response
  
//   socket.on('timeout', () => {
//     console.log('⏰ Connection timeout - device will reconnect');
//     socket.destroy();
//   });
// });

// console.log("🚀 GPS TRACKER SERVER STARTED ON PORT 5000");
// console.log("🔧 Features: Correct CRC-16, Proper ACK packets, GPS parsing");
// console.log("📚 Based on your protocol documentation");
// console.log("=====================================");

// server.listen(5000, () => {
//   console.log("✅ Server ready with correct GPS protocol implementation");
// });

// // Graceful shutdown
// process.on('SIGINT', () => {
//   console.log('\n🛑 Shutting down GPS server...');
//   server.close(() => {
//     console.log('✅ Server stopped');
//     process.exit(0);
//   });
// });