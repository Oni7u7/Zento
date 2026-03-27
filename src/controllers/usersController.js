const db = require('../services/db');
const { v4: uuidv4 } = require('uuid');

async function createUser(req, res) {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, email' });
    }
    const user = db.createUser({
      id: 'user-' + uuidv4().slice(0, 8),
      nombre,
      email,
      kycStatus: 'pending'
    });
    return res.status(201).json({ id: user.id, nombre: user.nombre, email: user.email, kycStatus: user.kycStatus });
  } catch (err) {
    console.error('[users] create error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createUser };
