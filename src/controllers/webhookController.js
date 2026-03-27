const crypto = require('crypto');
const db = require('../services/db');

function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-etherfuse-signature'];
    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== hmac) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;
    console.log('[webhook] event:', event, JSON.stringify(data));

    if (event === 'order.completed') {
      const roomPlayers = db.getRoomPlayers(data.roomId);
      const player = roomPlayers.find(p => p.userId === data.userId) ||
                     roomPlayers.find(p => p.orderId === data.orderId);

      if (player) {
        player.status = 'active';
        player.orderId = data.orderId;

        const room = db.getRoomById(player.roomId);
        if (room) {
          const allPlayers = db.getRoomPlayers(room.id);
          const allActive = allPlayers.length > 0 && allPlayers.every(p => p.status === 'active');
          if (allActive) {
            db.updateRoom(room.id, { estado: 'playing', startTime: new Date().toISOString() });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { handleWebhook };
