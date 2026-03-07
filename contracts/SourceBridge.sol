// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SourceBridge
 * @dev Mock bridge contract on the source chain (Ethereum)
 * 
 * This contract manages:
 * - Reserve token balances
 * - Locked amounts (tokens bridged to destination)
 * - Emergency pause mechanism
 */
contract SourceBridge {
    // ============ State Variables ============
    
    /// Total reserves available on this chain
    uint256 public sourceReserve;
    
    /// Reserves on destination chain (for demo purposes)
    uint256 public destinationReserve;
    
    /// Amount of tokens currently locked/bridged to destination
    uint256 public lockedAmount;
    
    /// Whether the bridge is paused
    bool public paused;
    
    /// Contract owner
    address public owner;
    
    /// Advanced Attack Mock Signals
    bool public governanceCompromised;
    bool public failedProof;
    
    // ============ Events ============
    
    event ReservesUpdated(uint256 newSourceReserve, uint256 newDestReserve);
    event LockedAmountUpdated(uint256 newLockedAmount);
    event BridgePaused(uint256 timestamp);
    event BridgeUnpaused(uint256 timestamp);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Bridge is paused");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        // Initialize with healthy reserves
        sourceReserve = 1000 ether;      // 1000 tokens on source (ETH)
        destinationReserve = 500 ether;  // 500 tokens on destination (Polygon)
        lockedAmount = 200 ether;        // 200 tokens locked (20% risk ratio)
        paused = false;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get the source chain reserve balance
     * @return Current reserve balance in wei
     * 
     * This is what SentinelBridge workflow reads via RPC
     */
    function getSourceReserves() external view returns (uint256) {
        return sourceReserve;
    }
    
    /**
     * @dev Get the destination chain reserve balance
     * @return Current destination reserve in wei
     */
    function getDestReserves() external view returns (uint256) {
        return destinationReserve;
    }
    
    /**
     * @dev Get the amount of tokens locked on destination chain
     * @return Amount of tokens currently at risk on destination
     * 
     * Risk Ratio = lockedAmount / sourceReserve
     * When this exceeds 80%, circuit breaker should activate
     */
    function getLockedAmount() external view returns (uint256) {
        return lockedAmount;
    }
    
    /**
     * @dev Check if bridge is paused
     * @return Whether bridge is in paused state
     */
    function isPaused() external view returns (bool) {
        return paused;
    }
    
    /**
     * @dev Calculate current risk ratio
     * @return Risk as percentage (0-100)
     */
    function getRiskRatio() external view returns (uint256) {
        if (sourceReserve == 0) return 0;
        return (lockedAmount * 100) / sourceReserve;
    }
    
    // ============ Admin Functions (for testing/demo) ============
    
    /**
     * @dev Set reserves (for simulation/demo purposes)
     * 
     * Usage: Simulate a hack or liquidity event
     * Example: setReserves(0) simulates complete reserve drain
     */
    function setReserves(
        uint256 newSourceReserve,
        uint256 newDestReserve
    ) external onlyOwner {
        sourceReserve = newSourceReserve;
        destinationReserve = newDestReserve;
        emit ReservesUpdated(newSourceReserve, newDestReserve);
    }
    
    /**
     * @dev Set locked amount (for simulation/demo purposes)
     * 
     * Usage: Simulate increased bridging activity
     * Example: setLockedAmount(850 ether) increases risk to 85%
     */
    function setLockedAmount(uint256 newLockedAmount) external onlyOwner {
        lockedAmount = newLockedAmount;
        emit LockedAmountUpdated(newLockedAmount);
    }
    
    // ============ Circuit Breaker Functions ============
    
    /**
     * @dev Emergency pause the bridge
     * 
     * Called by SentinelBridge workflow when risk threshold exceeded
     * This is the core protection mechanism
     */
    function pause() external onlyOwner {
        require(!paused, "Bridge is already paused");
        paused = true;
        emit BridgePaused(block.timestamp);
    }
    
    /**
     * @dev Unpause the bridge (manual admin action)
     * 
     * Called by humans after fixing the underlying issue
     */
    function unpause() external onlyOwner {
        require(paused, "Bridge is not paused");
        paused = false;
        emit BridgeUnpaused(block.timestamp);
    }
    
    /**
     * @dev Rate limit withdrawals (MEDIUM risk response)
     * 
     * Called by SentinelBridge workflow when suspicious velocity is detected
     * restricts withdrawals to maxPerHour
     */
    function rateLimitWithdrawals(uint256 maxPerHour) external onlyOwner {
        // In a real bridge, this would store the rate limit state
        // and enforce it in the withdrawTokens function
        // For currently, this just acts as an event trigger for visibility
        // in the demo
    }

    /**
     * @dev Simulate a governance hijack (for demo)
     */
    function triggerGovernanceHijack() external onlyOwner {
        governanceCompromised = true;
    }

    /**
     * @dev Simulate a proof verification failure (for demo)
     */
    function triggerProofFailure() external onlyOwner {
        failedProof = true;
    }

    /**
     * @dev Reset all mock signals (for demo)
     */
    function resetSignals() external onlyOwner {
        governanceCompromised = false;
        failedProof = false;
        paused = false;
    }
    
    // ============ Transfer Functions (demo) ============
    
    /**
     * @dev Simulate bridging tokens (locks them on source)
     */
    function bridgeTokens(uint256 amount) external whenNotPaused {
        require(amount <= sourceReserve - lockedAmount, "Insufficient reserves");
        lockedAmount += amount;
        emit LockedAmountUpdated(lockedAmount);
    }
    
    /**
     * @dev Simulate withdrawing bridged tokens (unlocks them)
     */
    function withdrawTokens(uint256 amount) external {
        require(amount <= lockedAmount, "Insufficient locked amount");
        lockedAmount -= amount;
        emit LockedAmountUpdated(lockedAmount);
    }
}
