// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZentoVault
 * @notice Custodia los depósitos de los jugadores por sala.
 *         El backend declara al ganador y le transfiere el yield;
 *         todos los demás recuperan su depósito intacto.
 */
contract ZentoVault {
    address public owner;

    struct Room {
        uint256 entryAmount;  // en wei
        uint256 pool;         // total acumulado
        address[] players;
        bool     active;
        address  winner;
    }

    mapping(bytes32 => Room)                          public rooms;
    mapping(bytes32 => mapping(address => uint256))   public deposits;

    event RoomCreated    (bytes32 indexed roomId, uint256 entryAmount);
    event PlayerDeposited(bytes32 indexed roomId, address player, uint256 amount);
    event WinnerPaid     (bytes32 indexed roomId, address winner,  uint256 yieldAmount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() { owner = msg.sender; }

    // ── Crear sala ────────────────────────────────────────────
    function createRoom(bytes32 roomId, uint256 entryAmount) external onlyOwner {
        require(!rooms[roomId].active, "Room already active");
        rooms[roomId] = Room({ entryAmount: entryAmount, pool: 0, players: new address[](0), active: true, winner: address(0) });
        emit RoomCreated(roomId, entryAmount);
    }

    // ── Depositar MON al unirse a la sala ────────────────────
    function deposit(bytes32 roomId) external payable {
        Room storage r = rooms[roomId];
        require(r.active, "Room not active");
        require(msg.value == r.entryAmount, "Wrong entry amount");
        require(deposits[roomId][msg.sender] == 0, "Already deposited");
        deposits[roomId][msg.sender] = msg.value;
        r.pool += msg.value;
        r.players.push(msg.sender);
        emit PlayerDeposited(roomId, msg.sender, msg.value);
    }

    // ── Distribuir: devolver depósitos + yield al ganador ────
    function distribute(bytes32 roomId, address winner, uint256 yieldAmount) external onlyOwner {
        Room storage r = rooms[roomId];
        require(r.active, "Not active");
        r.active = false;
        r.winner = winner;
        // Devolver depósitos
        for (uint i = 0; i < r.players.length; i++) {
            address p = r.players[i];
            uint256 d = deposits[roomId][p];
            if (d > 0) { deposits[roomId][p] = 0; payable(p).transfer(d); }
        }
        // Yield al ganador (desde el saldo del contrato)
        if (yieldAmount > 0 && address(this).balance >= yieldAmount) {
            payable(winner).transfer(yieldAmount);
        }
        emit WinnerPaid(roomId, winner, yieldAmount);
    }

    // ── Vistas ───────────────────────────────────────────────
    function getRoom(bytes32 roomId) external view returns (
        uint256 pool, uint256 entryAmount, address[] memory players, bool active, address winner
    ) {
        Room storage r = rooms[roomId];
        return (r.pool, r.entryAmount, r.players, r.active, r.winner);
    }

    function getPlayers(bytes32 roomId) external view returns (address[] memory) {
        return rooms[roomId].players;
    }

    receive() external payable {}
}
