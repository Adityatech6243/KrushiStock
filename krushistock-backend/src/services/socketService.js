const WebSocket = require('ws');
const logger = require('../utils/logger');
const { fetchDashboardStatsData } = require('./dashboardService');

let wss = null;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', async (ws) => {
    logger.info('Dashboard WebSocket client connected');
    
    // Send initial stats on connect
    try {
      const stats = await fetchDashboardStatsData();
      ws.send(JSON.stringify({ type: 'stats_update', data: stats }));
    } catch (err) {
      logger.error(`Error sending initial stats: ${err.message}`);
    }

    ws.on('close', () => {
      logger.info('Dashboard WebSocket client disconnected');
    });
  });
};

const broadcastStatsUpdate = async () => {
  if (!wss) return;
  try {
    const stats = await fetchDashboardStatsData();
    const payload = JSON.stringify({ type: 'stats_update', data: stats });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    logger.info('Broadcasted dashboard stats update to all active WS clients');
  } catch (err) {
    logger.error(`WebSocket broadcast error: ${err.message}`);
  }
};

module.exports = { initWebSocket, broadcastStatsUpdate };
