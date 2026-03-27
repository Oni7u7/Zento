// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZentoRoom
 * @notice Contrato individual por sala.
 *         Cada sala despliega su propio contrato.
 *         Entrada fija: 0.1 MON (configurable al desplegar).
 *         El owner declara al ganador; todos recuperan depósito + ganador recibe yield.
 */
contract ZentoRoom {
    address public owner;
    string  public roomName;
    uint256 public entryAmount;   // en wei (0.1 MON = 1e17)
    address[] public players;
    mapping(address => bool) public hasDeposited;
    bool    public finished;
    address public winner;
    uint256 public createdAt;

    event PlayerDeposited(address indexed player, uint256 amount);
    event WinnerPaid(address indexed winner, uint256 yieldAmount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(string memory _roomName, uint256 _entryAmount) {
        owner       = msg.sender;
        roomName    = _roomName;
        entryAmount = _entryAmount;
        createdAt   = block.timestamp;
    }

    // ── Depositar al unirse ───────────────────────────────────
    function deposit() external payable {
        require(!finished,                    "Room finished");
        require(msg.value == entryAmount,     "Wrong entry amount");
        require(!hasDeposited[msg.sender],    "Already deposited");
        hasDeposited[msg.sender] = true;
        players.push(msg.sender);
        emit PlayerDeposited(msg.sender, msg.value);
    }

    // ── Declarar ganador y distribuir ────────────────────────
    function distribute(address _winner) external onlyOwner {
        require(!finished, "Already finished");
        require(players.length > 0, "No players");
        finished = true;
        winner   = _winner;

        // Yield simulado: 1% del pool para demo
        uint256 pool  = players.length * entryAmount;
        uint256 yield = pool / 100;

        // Devolver depósito a todos
        for (uint i = 0; i < players.length; i++) {
            if (players[i] != _winner) {
                payable(players[i]).transfer(entryAmount);
            }
        }
        // Ganador recibe su depósito + yield
        uint256 winnerPayout = entryAmount + yield;
        if (address(this).balance >= winnerPayout) {
            payable(_winner).transfer(winnerPayout);
        } else {
            payable(_winner).transfer(address(this).balance);
        }

        emit WinnerPaid(_winner, yield);
    }

    // ── Vistas ───────────────────────────────────────────────
    function getPlayers()  external view returns (address[] memory) { return players; }
    function playerCount() external view returns (uint256) { return players.length; }
    function poolBalance() external view returns (uint256) { return address(this).balance; }

    receive() external payable {}
}
