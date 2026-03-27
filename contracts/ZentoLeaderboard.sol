// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZentoLeaderboard
 * @notice Registra scores en cadena por sala.
 *         El backend envía los scores al terminar la trivia;
 *         el contrato determina y almacena al ganador de forma inmutable.
 */
contract ZentoLeaderboard {
    address public owner;

    struct Score {
        address player;
        uint256 score;
        uint256 timestamp;
        string  nickname;
    }

    mapping(bytes32 => Score[])  public roomScores;
    mapping(bytes32 => address)  public roomWinner;
    mapping(bytes32 => uint256)  public topScore;

    event ScoreSubmitted (bytes32 indexed roomId, address player, string nickname, uint256 score);
    event WinnerDeclared (bytes32 indexed roomId, address winner,  uint256 score);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() { owner = msg.sender; }

    // ── Enviar score de un jugador ────────────────────────────
    function submitScore(bytes32 roomId, address player, uint256 score, string calldata nickname) external onlyOwner {
        roomScores[roomId].push(Score({ player: player, score: score, timestamp: block.timestamp, nickname: nickname }));
        // Actualizar líder en tiempo real
        if (score > topScore[roomId]) {
            topScore[roomId] = score;
            roomWinner[roomId] = player;
        }
        emit ScoreSubmitted(roomId, player, nickname, score);
    }

    // ── Finalizar: emitir WinnerDeclared ─────────────────────
    function finalizeRoom(bytes32 roomId) external onlyOwner returns (address winner, uint256 winScore) {
        winner   = roomWinner[roomId];
        winScore = topScore[roomId];
        require(winner != address(0), "No scores yet");
        emit WinnerDeclared(roomId, winner, winScore);
    }

    // ── Vistas ───────────────────────────────────────────────
    function getScores(bytes32 roomId) external view returns (Score[] memory) {
        return roomScores[roomId];
    }

    function getLeader(bytes32 roomId) external view returns (address leader, uint256 score) {
        return (roomWinner[roomId], topScore[roomId]);
    }

    function scoreCount(bytes32 roomId) external view returns (uint256) {
        return roomScores[roomId].length;
    }
}
