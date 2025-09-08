const WebSocket = require("ws");
require("dotenv").config();

const WS_PORT = parseInt(process.env.WS_PORT || "7001", 10);
const WS_HOST = process.env.WS_HOST || "0.0.0.0";

const wss = new WebSocket.Server({ port: WS_PORT, host: WS_HOST });

console.log(`🚀 WebSocket server running at ws://${WS_HOST}:${WS_PORT}`);

const clients = new Map();

// Add heartbeat mechanism
const heartbeatInterval = setInterval(function ping() {
  console.log(`Sending heartbeat to ${wss.clients.size} clients`);
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection for IMEI: ${ws.imei || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("connection", (ws) => {
  console.log("✅ New WebSocket client connected");
  
  // Initialize heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on("message", (message) => {
    try {
      console.log(`Raw message received: ${message}`);
      const parsed = JSON.parse(message);
      const { imei } = parsed;
      
      if (!imei) {
        console.warn("No IMEI provided in message");
        ws.send(JSON.stringify({ error: "IMEI is required" }));
        return;
      }

      ws.imei = imei;
      if (!clients.has(imei)) {
        clients.set(imei, []);
        console.log(`Created new subscription list for IMEI: ${imei}`);
      }
      
      const clientList = clients.get(imei);
      if (!clientList.includes(ws)) {
        clientList.push(ws);
        console.log(`Client subscribed for IMEI: ${imei}`);
      }

      ws.send(JSON.stringify({ 
        type: "subscribed", 
        imei,
        message: `Successfully subscribed to GPS updates for ${imei}`
      }));
    } catch (err) {
      console.error("Error parsing message:", err);
      ws.send(JSON.stringify({ error: "Invalid JSON" }));
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`Client disconnected. Code: ${code}, Reason: ${reason}`);
    
    if (ws.imei && clients.has(ws.imei)) {
      const updated = clients.get(ws.imei).filter((c) => c !== ws);
      if (updated.length === 0) {
        clients.delete(ws.imei);
        console.log(`Removed last client for IMEI: ${ws.imei}`);
      } else {
        clients.set(ws.imei, updated);
        console.log(`Remaining subscribers for ${ws.imei}: ${updated.length}`);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error);
  });
});

function getBroadcastGPS() {
  return function (imei, lat, lon, ignition, speed) {
    console.log(`Broadcasting GPS data for IMEI: ${imei}`);
    
    const subscribers = clients.get(imei) || [];
    if (subscribers.length === 0) {
      console.log(`No subscribers found for IMEI: ${imei}`);
      return;
    }

    const message = JSON.stringify({
      type: "gps_update",
      imei,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      ignition: Boolean(ignition),
      speed: parseInt(speed) || 0,
      timestamp: new Date().toISOString(),
    });

    let successCount = 0;
    let failCount = 0;

    for (const client of subscribers) {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          successCount++;
        } else {
          failCount++;
          console.log(`Client not open for IMEI: ${imei}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Error sending to client: ${error.message}`);
      }
    }

    console.log(`Broadcast complete: ${successCount} sent, ${failCount} failed`);
  };
}

// Server error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  clearInterval(heartbeatInterval);
  
  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });
  
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

module.exports = { getBroadcastGPS };