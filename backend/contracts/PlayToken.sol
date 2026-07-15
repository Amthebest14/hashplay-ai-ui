// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PlayToken — $PLAY Bonding Curve Token
 * @notice HashPlay's native token. Price rises automatically as more PLAY is bought.
 *         - Buy PLAY with HBAR (price goes up with every purchase)
 *         - Sell PLAY back for HBAR (5% spread retained as liquidity)
 *         - Owner can mint for airdrops and game rewards (ArenaV6)
 *
 * Linear bonding curve:
 *   price_per_PLAY = 0.0001 HBAR + (0.0001 HBAR × totalBondingSupply / 1,000,000)
 *   i.e. price doubles at every 1M PLAY sold through the curve.
 */
contract PlayToken is ERC20, Ownable, ReentrancyGuard {

    // ── Bonding Curve Parameters ────────────────────────────────────────────
    uint256 public constant BASE_PRICE = 1e14;   // 0.0001 HBAR in wei (starting price)
    uint256 public constant SLOPE      = 1e8;    // price increment per whole PLAY sold via curve

    // Tracks only curve-purchased supply (not airdrops/rewards)
    uint256 public bondingSupply;

    // Minters (ArenaV6 contract gets this role to reward players)
    mapping(address => bool) public isMinter;

    // ── Events ──────────────────────────────────────────────────────────────
    event TokensPurchased(address indexed buyer,  uint256 hbarPaid,    uint256 playReceived);
    event TokensSold     (address indexed seller, uint256 playSold,    uint256 hbarReceived);
    event Airdropped     (address indexed player, uint256 playAmount,  uint256 xpSnapshot);
    event MinterSet      (address indexed minter, bool    status);
    event GameReward     (address indexed player, uint256 playAmount,  bool won);

    // ── Constructor ─────────────────────────────────────────────────────────
    constructor() ERC20("HashPlay Token", "PLAY") Ownable(msg.sender) {}

    // Override decimals to 8 (matching HBAR precision)
    function decimals() public pure override returns (uint8) { return 8; }

    // ── Bonding Curve Price ──────────────────────────────────────────────────
    /**
     * @notice Returns current price in wei (HBAR) per 1 whole PLAY token.
     * Price increases linearly with every PLAY sold through the curve.
     */
    function currentPrice() public view returns (uint256) {
        return BASE_PRICE + (SLOPE * (bondingSupply / 1e8));
    }

    // ── Buy PLAY ─────────────────────────────────────────────────────────────
    /**
     * @notice Send HBAR to receive PLAY at current bonding curve price.
     */
    function buy() external payable nonReentrant {
        require(msg.value > 0, "PLAY: Send HBAR to buy");
        uint256 price = currentPrice();

        // Convert TINYBARS to WEI for Hedera EVM compatibility
        uint256 msgValueWei = msg.value * 1e10;
        uint256 playAmount = (msgValueWei * 1e8) / price;
        require(playAmount > 0, "PLAY: Amount too small");

        bondingSupply += playAmount;
        _mint(msg.sender, playAmount);

        emit TokensPurchased(msg.sender, msgValueWei, playAmount);
    }

    // ── Sell PLAY ────────────────────────────────────────────────────────────
    /**
     * @notice Burn PLAY and receive HBAR back at 95% of current price (5% spread).
     * The 5% spread stays in the contract as liquidity reserve.
     */
    function sell(uint256 playAmount) external nonReentrant {
        require(playAmount > 0, "PLAY: Amount must be > 0");
        require(balanceOf(msg.sender) >= playAmount, "PLAY: Insufficient balance");

        uint256 price      = currentPrice();
        uint256 hbarGross  = (playAmount * price) / 1e8;
        uint256 hbarPayout = (hbarGross * 95) / 100; // 5% spread

        // Convert WEI to TINYBARS for Hedera EVM compatibility
        uint256 hbarPayoutTinybars = hbarPayout / 1e10;

        require(address(this).balance >= hbarPayoutTinybars, "PLAY: Insufficient liquidity");

        // Only reduce bondingSupply if amount came from bonding curve
        if (bondingSupply >= playAmount) bondingSupply -= playAmount;

        _burn(msg.sender, playAmount);
        (bool ok, ) = payable(msg.sender).call{value: hbarPayoutTinybars}("");
        require(ok, "PLAY: HBAR transfer failed");

        emit TokensSold(msg.sender, playAmount, hbarPayout);
    }

    // ── Airdrop (Owner only) ─────────────────────────────────────────────────
    /**
     * @notice Mint PLAY to a player as airdrop. Pass their XP snapshot for event logging.
     */
    function airdrop(address player, uint256 playAmount, uint256 xpSnapshot) external onlyOwner {
        require(player != address(0), "PLAY: Invalid address");
        _mint(player, playAmount);
        emit Airdropped(player, playAmount, xpSnapshot);
    }

    /**
     * @notice Batch airdrop to multiple players in one tx.
     */
    function batchAirdrop(
        address[] calldata players,
        uint256[] calldata amounts,
        uint256[] calldata xpSnapshots
    ) external onlyOwner {
        require(players.length == amounts.length && amounts.length == xpSnapshots.length, "PLAY: Array length mismatch");
        for (uint256 i = 0; i < players.length; i++) {
            _mint(players[i], amounts[i]);
            emit Airdropped(players[i], amounts[i], xpSnapshots[i]);
        }
    }

    // ── Game Rewards (ArenaV6 / Minters) ────────────────────────────────────
    /**
     * @notice Called by ArenaV6 contract to reward players after each game.
     */
    function rewardPlayer(address player, uint256 playAmount, bool won) external {
        require(isMinter[msg.sender] || msg.sender == owner(), "PLAY: Not authorized minter");
        require(player != address(0), "PLAY: Invalid address");
        _mint(player, playAmount);
        emit GameReward(player, playAmount, won);
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    /**
     * @notice Grant or revoke minting rights to a contract (e.g. ArenaV6).
     */
    function setMinter(address minter, bool status) external onlyOwner {
        isMinter[minter] = status;
        emit MinterSet(minter, status);
    }

    /**
     * @notice Seed the contract with HBAR liquidity (for backing sells).
     */
    function seedLiquidity() external payable onlyOwner {}

    /**
     * @notice Emergency HBAR withdrawal by owner.
     */
    function withdrawHBAR(uint256 amount) external onlyOwner {
        uint256 tinybars = amount / 1e10;
        require(address(this).balance >= tinybars, "PLAY: Insufficient balance");
        (bool ok, ) = payable(owner()).call{value: tinybars}("");
        require(ok, "PLAY: Withdraw failed");
    }

    receive() external payable {}
}
