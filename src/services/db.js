const users = [
  { id: 'user-001', nombre: 'Alice', apodo: 'CryptoAlice', walletAddress: '0xAlice123', kycStatus: 'completed', bankAccountId: 'bank-001' },
  { id: 'user-002', nombre: 'Bob', apodo: 'FinanceBob', walletAddress: '0xBob456', kycStatus: 'completed', bankAccountId: 'bank-002' }
];

const rooms = [
  { id: 'SALA01', nombre: 'Trivia Zento #1', juego: 'Trivia Financiera', montoEntrada: 100, diasDuracion: 7, estado: 'waiting', jugadores: [], createdAt: new Date().toISOString() }
];

const players = [];

// Users
function createUser(data) {
  users.push(data);
  return data;
}

function getUserById(id) {
  return users.find(u => u.id === id);
}

function getUserByWallet(addr) {
  return users.find(u => u.walletAddress === addr);
}

// Rooms
function createRoom(data) {
  rooms.push(data);
  return data;
}

function getRoomById(id) {
  return rooms.find(r => r.id === id);
}

function updateRoom(id, patch) {
  const room = rooms.find(r => r.id === id);
  if (!room) return null;
  Object.assign(room, patch);
  return room;
}

// Players
function addPlayerToRoom(userId, roomId, depositAmount) {
  const player = {
    userId,
    roomId,
    depositAmount,
    score: 0,
    status: 'pending',
    joinedAt: new Date().toISOString()
  };
  players.push(player);
  const room = getRoomById(roomId);
  if (room) room.jugadores.push(userId);
  return player;
}

function updateScore(userId, roomId, puntos) {
  const player = players.find(p => p.userId === userId && p.roomId === roomId);
  if (!player) return null;
  player.score += puntos;
  return player;
}

function getRoomPlayers(roomId) {
  return players.filter(p => p.roomId === roomId);
}

function getPlayerInRoom(userId, roomId) {
  return players.find(p => p.userId === userId && p.roomId === roomId);
}

function getAllRooms() {
  return rooms;
}

module.exports = {
  createUser, getUserById, getUserByWallet,
  createRoom, getRoomById, updateRoom, getAllRooms,
  addPlayerToRoom, updateScore, getRoomPlayers, getPlayerInRoom
};
