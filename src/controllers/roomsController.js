const db = require('../services/db');
const etherfuse = require('../services/etherfuse');

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function listRooms(req, res) {
  try {
    const rooms = db.getAllRooms();
    return res.json(rooms);
  } catch (err) {
    console.error('[rooms] list error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function createRoom(req, res) {
  try {
    const { nombre, juego, montoEntrada, diasDuracion, creadorId, contractAddress } = req.body;
    if (!nombre || !juego || !montoEntrada || !diasDuracion) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, juego, montoEntrada, diasDuracion' });
    }
    const juegosValidos = ['Trivia Financiera', 'Cultura General', 'Mixto'];
    if (!juegosValidos.includes(juego)) {
      return res.status(400).json({ error: 'Juego debe ser: Trivia Financiera, Cultura General o Mixto' });
    }
    const room = db.createRoom({
      id: generateRoomCode(),
      nombre,
      juego,
      montoEntrada: Number(montoEntrada),
      diasDuracion: Number(diasDuracion),
      estado: 'waiting',
      jugadores: [],
      creadorId: creadorId || null,
      contractAddress: contractAddress || null,
      createdAt: new Date().toISOString()
    });
    return res.status(201).json(room);
  } catch (err) {
    console.error('[rooms] create error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function getRoom(req, res) {
  try {
    const room = db.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const players = db.getRoomPlayers(room.id);
    const now = Date.now();

    let yieldGenerated = 0;
    let tiempoRestante = room.diasDuracion * 24 * 3600;
    let secondsElapsed = 0;

    if (room.startTime) {
      secondsElapsed = (now - new Date(room.startTime).getTime()) / 1000;
      const totalSeconds = room.diasDuracion * 24 * 3600;
      tiempoRestante = Math.max(0, totalSeconds - secondsElapsed);
      yieldGenerated = room.montoEntrada * room.jugadores.length * 0.09 * secondsElapsed / (365 * 24 * 3600);
    }

    const scoreboard = players
      .map((p, i) => {
        const user = db.getUserById(p.userId);
        return { userId: p.userId, nombre: user?.apodo || user?.nombre || p.userId, score: p.score, status: p.status };
      })
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, posicion: i + 1 }));

    return res.json({
      ...room,
      players: scoreboard,
      yieldGenerated: Math.round(yieldGenerated * 100) / 100,
      tiempoRestante: Math.round(tiempoRestante),
      secondsElapsed: Math.round(secondsElapsed)
    });
  } catch (err) {
    console.error('[rooms] get error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function joinRoom(req, res) {
  try {
    const { userId } = req.body;
    const room = db.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    if (room.estado === 'playing') return res.status(400).json({ error: 'La sala ya está en juego' });
    if (room.estado === 'finished') return res.status(400).json({ error: 'La sala ya terminó' });

    const existing = db.getPlayerInRoom(userId, room.id);
    if (existing) return res.status(400).json({ error: 'Ya estás en esta sala' });

    db.addPlayerToRoom(userId, room.id, 0);
    const updated = db.getRoomById(room.id);

    const players = db.getRoomPlayers(room.id);
    const playerList = players.map(p => {
      const user = db.getUserById(p.userId);
      return { userId: p.userId, nombre: user?.apodo || user?.nombre || p.userId, score: p.score, status: p.status };
    });

    return res.json({ ...updated, players: playerList });
  } catch (err) {
    console.error('[rooms] join error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function closeRoom(req, res) {
  try {
    const room = db.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    if (room.estado !== 'playing') return res.status(400).json({ error: 'La sala no está en juego' });

    const players = db.getRoomPlayers(room.id).sort((a, b) => b.score - a.score);
    if (players.length === 0) return res.status(400).json({ error: 'No hay jugadores' });

    const now = Date.now();
    const diasJugados = (now - new Date(room.startTime).getTime()) / (1000 * 3600 * 24);
    const poolTotal = room.montoEntrada * players.length;
    const yieldTotal = poolTotal * 0.09 * diasJugados / 365;

    const winner = players[0];
    const winnerUser = db.getUserById(winner.userId);
    const resumenPagos = [];

    // Winner gets deposit + yield
    try {
      await etherfuse.createSwap('CETES', 'MXN', winner.depositAmount + yieldTotal, winnerUser.walletAddress);
    } catch (e) { console.error('[rooms] swap winner error:', e.message); }
    resumenPagos.push({ userId: winner.userId, nombre: winnerUser?.nombre, monto: Math.round((winner.depositAmount + yieldTotal) * 100) / 100, tipo: 'ganador' });

    // Others get deposit only
    for (const p of players.slice(1)) {
      const u = db.getUserById(p.userId);
      try {
        await etherfuse.createSwap('CETES', 'MXN', p.depositAmount, u.walletAddress);
      } catch (e) { console.error('[rooms] swap error:', e.message); }
      resumenPagos.push({ userId: p.userId, nombre: u?.nombre, monto: p.depositAmount, tipo: 'participante' });
    }

    db.updateRoom(room.id, { estado: 'finished', finishedAt: new Date().toISOString() });

    return res.json({
      ganador: { userId: winner.userId, nombre: winnerUser?.nombre, score: winner.score },
      yieldGenerado: Math.round(yieldTotal * 100) / 100,
      resumenPagos
    });
  } catch (err) {
    console.error('[rooms] close error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function updateScore(req, res) {
  try {
    const room = db.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    const { userId, puntos } = req.body;
    let player = db.getPlayerInRoom(userId, room.id);
    if (!player) {
      db.addPlayerToRoom(userId, room.id, 0);
      player = db.getPlayerInRoom(userId, room.id);
    }

    db.updateScore(userId, room.id, puntos);

    const allPlayers = db.getRoomPlayers(room.id);
    const scoreboard = allPlayers
      .map(p => {
        const u = db.getUserById(p.userId);
        return { userId: p.userId, nombre: u?.apodo || u?.nombre || p.userId, score: p.score };
      })
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, posicion: i + 1 }));

    return res.json(scoreboard);
  } catch (err) {
    console.error('[rooms] score error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { listRooms, createRoom, getRoom, joinRoom, closeRoom, updateScore };
