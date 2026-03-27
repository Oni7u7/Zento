const db = require('../services/db');
const etherfuse = require('../services/etherfuse');

async function createDeposit(req, res) {
  try {
    const { userId, roomId, amount } = req.body;
    if (!userId || !roomId || !amount) {
      return res.status(400).json({ error: 'userId, roomId y amount son requeridos' });
    }

    const user = db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.kycStatus !== 'completed') {
      return res.status(403).json({ error: 'KYC no completado' });
    }

    const room = db.getRoomById(roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const quote = await etherfuse.getQuote(amount, 'MXN', 'CETES');
    const quoteId = quote.quoteId ?? quote.id;
    const order = await etherfuse.createOrder(quoteId, user.walletAddress, user.bankAccountId);

    db.addPlayerToRoom(userId, roomId, amount);

    return res.json({
      orderId: order.orderId || order.id,
      quoteId,
      cetesAmount: quote.destinationAmount ?? quote.targetAmount ?? quote.estimatedAmount,
      message: 'Depósito iniciado'
    });
  } catch (err) {
    console.error('[deposit] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createDeposit };
