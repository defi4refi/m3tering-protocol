// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MultisigGuard} from "./MultisigGuard.sol";
import {IPriceFeed} from "./IPriceFeed.sol";
import {ITreasuryPolicy} from "./ITreasuryPolicy.sol";

/// @title RootsStaking
/// @notice stROOTS rebasing token — stake ROOTS, earn POL fees + gauge emissions + bribes
/// @dev Custom rebasing staking contract for Rooted Finance.
///      Epoch struct: {length, number, end, distribute}.
///      Base yield always distributed. Supplemental gated by market premium over NAV.
///      EPOCH_LENGTH = 8 hours, R_MAX = 0.55% per epoch, K = 1.4x.
///      Pausable for emergency response (TempleDAO lesson).
///      Circuit breaker stops supplemental emissions when price < floor for consecutive epochs
///      (RFV activist defense — Rome/Spartacus/Hector/Jade lesson).
///      Timelock on critical parameter changes (Spartacus lesson — dev changed params unilaterally).
///      All admin operations via multisig (Fortress/Minotaur lesson).
///      Bridged to Olympus V3 via StakingAdapter (IStaking) and RootsDistributor (IDistributor).
contract RootsStaking is ERC20, MultisigGuard, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    error NotEpochEnd();
    error RfvCapExceeded();
    error InvalidParams();
    error TimelockActive();
    error CircuitBreakerTripped();
    error NotAuthorized();

    uint256 public constant EPOCH_LENGTH = 8 hours;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant DEPLOYMENT_GRACE_PERIOD = 7 days; // No circuit breaker during first 7 days after deployment
    uint256 public constant PARAM_TIMELOCK = 2 days; // 2-day timelock on critical param changes

    // ======== ADJUSTABLE EMISSION PARAMS (multisig, timelocked) ======== //
    uint256 public rMax = 55; // Max supplemental rate in bps (0.55% per epoch)
    uint256 public kBps = 14000; // Premium multiplier threshold (1.4x)
    uint256 public rebaseRateCapBps = 45; // Cap rebase at 0.45% per epoch (per whitepaper)
    uint256 public pendingRMax;
    uint256 public pendingRMaxTime;
    uint256 public pendingKBps;
    uint256 public pendingKBpsTime;
    uint256 public pendingRebaseCap;
    uint256 public pendingRebaseCapTime;

    // ======== ADJUSTABLE CIRCUIT BREAKER PARAMS (multisig) ======== //
    uint256 public circuitBreakerThreshold = 21; // Trip after 21 consecutive epochs (7 days) below floor
    uint256 public circuitBreakerAutoReset = 21; // Auto-reset after 21 consecutive epochs (7 days) above floor
    uint256 public cbSoftResetThreshold = 7; // After 60 epochs tripped, reset after 7 epochs above floor
    uint256 public cbSoftResetEpochs = 60; // 20 days tripped → soften reset threshold
    uint256 public cbForcedResetEpochs = 55; // ~18 days tripped → force reset regardless of price
    uint256 public stakingRatioGateBps = 5000; // 50% — don't mint supplemental during stress exodus

    // ======== ADJUSTABLE RATE LIMITER PARAMS (multisig) ======== //
    uint256 public suppRateLimitWindow = 30; // 30-epoch window for rate limiter
    uint256 public suppRateLimitCapBps = 500; // 5% of total supply per window
    uint256 public suppWarmupEpochs = 30; // 1-month warmup — no rate limit during this period

    // ======== NAV WARMUP RAMP (multisig) ======== //
    /// @dev Linear ramp that scales supplemental mint from 0→100% over navWarmupEpochs.
    ///      Prevents massive supplemental mints when NAV is tiny at launch (premiumBps
    ///      can be enormous when navPerRoots is near zero, even if price is small).
    ///      Matches the simulation's nav_warmup_factor.
    uint256 public navWarmupEpochs = 50; // ~17 days linear ramp for supplemental at launch

    // ======== REWARD SMOOTHING BUFFER (multisig, timelocked) ======== //
    /// @dev During high-premium epochs, a portion of supplemental is diverted to a virtual buffer.
    ///      During low/no-premium epochs, buffer is drawn to maintain a floor rebase rate.
    ///      This breaks the feedback loop: falling price → falling rewards → unstaking → falling price.
    ///      The buffer is virtual — no actual token transfers, just adjusts distributed supplemental per epoch.
    uint256 public smoothingBuffer; // Virtual balance of deferred supplemental
    uint256 public smoothingDivertBps = 3000; // 30% of supplemental diverted to buffer during good times
    uint256 public smoothingFloorBps = 10; // 0.1% min rebase from buffer during bad times
    uint256 public smoothingBufferCapBps = 5000; // Max buffer = 50% of total supply
    uint256 public pendingSmoothingDivert;
    uint256 public pendingSmoothingDivertTime;
    uint256 public pendingSmoothingFloor;
    uint256 public pendingSmoothingFloorTime;
    uint256 public pendingSmoothingCap;
    uint256 public pendingSmoothingCapTime;
    uint256 public circuitBreakerCount; // Consecutive epochs where TWAP < floor
    uint256 public circuitBreakerRecoveryCount; // Consecutive epochs where TWAP >= floor (after tripped)
    uint256 public circuitBreakerTripEpoch; // Epoch when CB was tripped (for gradual softening)
    bool public circuitBreakerTripped; // Once tripped, supplemental emissions halted until reset
    uint256 public immutable deploymentTimestamp; // When contract was deployed (for grace period)
    uint256 public pendingRewardRate; // Timelocked reward rate
    uint256 public pendingRewardRateTime; // When timelock expires
    uint256 public suppWindowMinted; // Cumulative supplemental minted in current window
    uint256 public suppWindowStartEpoch; // Epoch when current rate limit window started

    /// @dev Olympus V3 IStaking.Epoch struct
    struct Epoch {
        uint256 length;
        uint256 number;
        uint256 end;
        uint256 distribute;
    }

    Epoch public epochData;

    IERC20 public immutable rootsToken;
    IPriceFeed public priceFeed;
    ITreasuryPolicy public treasuryPolicy;

    uint256 public lastIndex;
    uint256 public rewardRate;
    uint256 public totalHarvested;
    uint256 public totalSupplementalMinted;

    event Staked(address indexed user, uint256 indexed rootsAmount, uint256 indexed stRootsAmount);

    event Rebased(uint256 indexed newIndex, uint256 indexed harvestYield, uint256 indexed supplementalMint);

    event PriceFeedUpdated(address indexed feed);

    event RewardRateUpdated(uint256 indexed newRate);

    event CircuitBreakerAutoReset(uint256 indexed consecutiveRecoveryEpochs);
    event CircuitBreakerReset();
    event CircuitBreakerTrippedEvent(uint256 indexed circuitBreakerCount);
    event Harvested(uint256 indexed totalYieldValue);
    event TreasuryPolicyUpdated(address indexed _policy);
    event Unstaked(address indexed sender, uint256 indexed stRootsAmount, uint256 indexed rootsAmount);

    event EmissionParamsUpdated(uint256 rMax, uint256 kBps, uint256 rebaseRateCapBps);
    event CircuitBreakerParamsUpdated(
        uint256 threshold, uint256 autoReset, uint256 softResetThreshold,
        uint256 softResetEpochs, uint256 forcedResetEpochs, uint256 stakingRatioGate
    );
    event RateLimitParamsUpdated(uint256 window, uint256 capBps, uint256 warmupEpochs, uint256 navWarmupEpochs);
    event SmoothingParamsUpdated(uint256 divertBps, uint256 floorBps, uint256 bufferCapBps);
    event SmoothingBufferDeposited(uint256 indexed amount, uint256 indexed bufferBalance);
    event SmoothingBufferDrawn(uint256 indexed amount, uint256 indexed bufferBalance);


    constructor(
        address _rootsToken,
        address _priceFeed,
        address _treasuryPolicy,
        address _multisig
    ) ERC20("Staked ROOTS", "stROOTS") MultisigGuard(_multisig) {
        if (_rootsToken == address(0)) revert ZeroAddress();
        rootsToken = IERC20(_rootsToken);
        priceFeed = IPriceFeed(_priceFeed);
        treasuryPolicy = ITreasuryPolicy(_treasuryPolicy);
        deploymentTimestamp = block.timestamp;
        lastIndex = 1e18;
        epochData = Epoch({
            length: EPOCH_LENGTH,
            number: 0,
            end: block.timestamp + EPOCH_LENGTH,
            distribute: 0
        });
    }

    function setPriceFeed(address _feed) external onlyMultisig {
        if (_feed == address(0)) revert ZeroAddress();
        priceFeed = IPriceFeed(_feed);
        emit PriceFeedUpdated(_feed);
    }

    function setTreasuryPolicy(address _policy) external onlyMultisig {
        if (_policy == address(0)) revert ZeroAddress();
        treasuryPolicy = ITreasuryPolicy(_policy);
        emit TreasuryPolicyUpdated(_policy);
    }

    // ======== EMISSION PARAM SETTERS (timelocked) ======== //

    function proposeEmissionParams(uint256 _rMax, uint256 _kBps, uint256 _rebaseCap) external onlyMultisig {
        pendingRMax = _rMax;
        pendingKBps = _kBps;
        pendingRebaseCap = _rebaseCap;
        pendingRMaxTime = block.timestamp + PARAM_TIMELOCK;
        pendingKBpsTime = block.timestamp + PARAM_TIMELOCK;
        pendingRebaseCapTime = block.timestamp + PARAM_TIMELOCK;
    }

    function executeEmissionParams() external onlyMultisig {
        if (block.timestamp < pendingRMaxTime) revert TimelockActive();
        rMax = pendingRMax;
        kBps = pendingKBps;
        rebaseRateCapBps = pendingRebaseCap;
        emit EmissionParamsUpdated(rMax, kBps, rebaseRateCapBps);
    }

    // ======== CIRCUIT BREAKER PARAM SETTERS (direct, multisig) ======== //

    function setCircuitBreakerParams(
        uint256 _threshold,
        uint256 _autoReset,
        uint256 _softResetThreshold,
        uint256 _softResetEpochs,
        uint256 _forcedResetEpochs,
        uint256 _stakingRatioGate
    ) external onlyMultisig {
        circuitBreakerThreshold = _threshold;
        circuitBreakerAutoReset = _autoReset;
        cbSoftResetThreshold = _softResetThreshold;
        cbSoftResetEpochs = _softResetEpochs;
        cbForcedResetEpochs = _forcedResetEpochs;
        stakingRatioGateBps = _stakingRatioGate;
        emit CircuitBreakerParamsUpdated(
            _threshold, _autoReset, _softResetThreshold,
            _softResetEpochs, _forcedResetEpochs, _stakingRatioGate
        );
    }

    // ======== RATE LIMITER PARAM SETTERS (direct, multisig) ======== //

    function setRateLimitParams(
        uint256 _window,
        uint256 _capBps,
        uint256 _warmupEpochs
    ) external onlyMultisig {
        suppRateLimitWindow = _window;
        suppRateLimitCapBps = _capBps;
        suppWarmupEpochs = _warmupEpochs;
        emit RateLimitParamsUpdated(_window, _capBps, _warmupEpochs, navWarmupEpochs);
    }

    function setNavWarmupEpochs(uint256 _navWarmupEpochs) external onlyMultisig {
        navWarmupEpochs = _navWarmupEpochs;
        emit RateLimitParamsUpdated(suppRateLimitWindow, suppRateLimitCapBps, suppWarmupEpochs, _navWarmupEpochs);
    }

    // ======== SMOOTHING BUFFER PARAM SETTERS (timelocked) ======== //

    function proposeSmoothingParams(uint256 _divertBps, uint256 _floorBps, uint256 _bufferCapBps) external onlyMultisig {
        pendingSmoothingDivert = _divertBps;
        pendingSmoothingDivertTime = block.timestamp + PARAM_TIMELOCK;
        pendingSmoothingFloor = _floorBps;
        pendingSmoothingFloorTime = block.timestamp + PARAM_TIMELOCK;
        pendingSmoothingCap = _bufferCapBps;
        pendingSmoothingCapTime = block.timestamp + PARAM_TIMELOCK;
    }

    function executeSmoothingParams() external onlyMultisig {
        if (block.timestamp < pendingSmoothingDivertTime) revert TimelockActive();
        smoothingDivertBps = pendingSmoothingDivert;
        smoothingFloorBps = pendingSmoothingFloor;
        smoothingBufferCapBps = pendingSmoothingCap;
        emit SmoothingParamsUpdated(smoothingDivertBps, smoothingFloorBps, smoothingBufferCapBps);
    }

    /// @notice Propose a new reward rate — starts a 2-day timelock (Spartacus lesson)
    function proposeRewardRate(uint256 _rate) external onlyMultisig {
        pendingRewardRate = _rate;
        pendingRewardRateTime = block.timestamp + PARAM_TIMELOCK;
    }

    /// @notice Execute a proposed reward rate after timelock expires
    function executeRewardRate() external onlyMultisig {
        if (block.timestamp < pendingRewardRateTime) revert TimelockActive();
        rewardRate = pendingRewardRate;
        emit RewardRateUpdated(pendingRewardRate);
    }

    /// @notice Stake ROOTS to receive stROOTS at current index
    function stake(uint256 rootsAmount) external nonReentrant whenNotPaused returns (uint256 stRootsAmount) {
        if (rootsAmount == 0) revert InvalidParams();
        stRootsAmount = (rootsAmount * 1e18) / lastIndex;
        rootsToken.safeTransferFrom(msg.sender, address(this), rootsAmount);
        _mint(msg.sender, stRootsAmount);
        emit Staked(msg.sender, rootsAmount, stRootsAmount);
    }

    /// @notice Unstake stROOTS to receive ROOTS at current index
    function unstake(uint256 stRootsAmount) external nonReentrant whenNotPaused returns (uint256 rootsAmount) {
        if (stRootsAmount == 0) revert InvalidParams();
        rootsAmount = (stRootsAmount * lastIndex) / 1e18;
        _burn(msg.sender, stRootsAmount);
        rootsToken.safeTransfer(msg.sender, rootsAmount);
        emit Unstaked(msg.sender, stRootsAmount, rootsAmount);
    }

    /// @notice Harvest yield from POL fees, gauge emissions, and bribes
    /// @dev Permissionless — any keeper can call to deposit harvested yield
    function harvest(address[] calldata yieldTokens, uint256[] calldata amounts) external {
        if (yieldTokens.length != amounts.length) revert InvalidParams();
        uint256 totalYieldValue = 0;
        uint256 tokenLen = yieldTokens.length;
        for (uint256 i = 0; i < tokenLen; ++i) {
            if (amounts[i] > 0) {
                IERC20(yieldTokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
                uint256 price = priceFeed.getTokenPrice(yieldTokens[i]);
                totalYieldValue += (amounts[i] * price) / 1e18;
            }
        }
        totalHarvested += totalYieldValue;
        emit Harvested(totalYieldValue);
    }

    /// @notice Rebase stROOTS index — distributes harvested yield + supplemental emissions
    /// @dev Called at epoch end. Uses Olympus V3 Distributor nextRewardFor pattern for base yield.
    ///      Circuit breaker: if TWAP < floor for CIRCUIT_BREAKER_THRESHOLD consecutive epochs,
    ///      supplemental emissions are halted until manually reset. This prevents inflationary
    ///      death spiral when token is below backing (Rome/Spartacus/Hector/Jade lesson).
    ///      Permissionless — any keeper can call at epoch end.
    function rebase() external whenNotPaused {
        if (block.timestamp < epochData.end) revert NotEpochEnd();

        uint256 contractBalance = rootsToken.balanceOf(address(this));
        uint256 stRootsSupply = totalSupply();
        if (stRootsSupply == 0) {
            ++epochData.number;
            epochData.end = block.timestamp + epochData.length;
            return;
        }

        // Track un-divided numerator for precise calculations
        uint256 newIndexNumerator = contractBalance * 1e18;
        uint256 newIndex = newIndexNumerator / stRootsSupply;

        uint256 supplementalMint = 0;
        uint256 totalRootsSupply = IERC20(address(rootsToken)).totalSupply();
        uint256 navPerRoots = priceFeed.getNavPerToken();
        if (navPerRoots > 0) {
            uint256 twapRoots = priceFeed.getTokenPrice(address(rootsToken));
            uint256 floorPrice = ITreasuryPolicy(address(treasuryPolicy)).floorPrice();

            // Circuit breaker: track consecutive epochs below floor (skip during deployment grace period)
            bool inGracePeriod = block.timestamp < deploymentTimestamp + DEPLOYMENT_GRACE_PERIOD;
            // Forced reset check first — triggers regardless of price
            if (circuitBreakerTripped) {
                uint256 epochsTripped = epochData.number - circuitBreakerTripEpoch;
                if (epochsTripped >= cbForcedResetEpochs) {
                    circuitBreakerTripped = false;
                    circuitBreakerCount = 0;
                    circuitBreakerRecoveryCount = 0;
                    emit CircuitBreakerAutoReset(cbForcedResetEpochs);
                }
            }
            if (floorPrice > 0 && twapRoots < floorPrice && !inGracePeriod) {
                ++circuitBreakerCount;
                circuitBreakerRecoveryCount = 0;
                if (circuitBreakerCount >= circuitBreakerThreshold && !circuitBreakerTripped) {
                    circuitBreakerTripped = true;
                    circuitBreakerTripEpoch = epochData.number;
                    emit CircuitBreakerTrippedEvent(circuitBreakerCount);
                }
            } else if (circuitBreakerTripped) {
                // Recovery logic only (forced reset already checked above)
                if (twapRoots >= floorPrice) {
                    // Auto-reset: count recovery epochs when price is above floor
                    ++circuitBreakerRecoveryCount;
                    // Gradual softening: after 60 epochs tripped, reduce reset threshold from 21 to 7
                    uint256 epochsTripped = epochData.number - circuitBreakerTripEpoch;
                    uint256 effectiveReset = epochsTripped > cbSoftResetEpochs
                        ? cbSoftResetThreshold
                        : circuitBreakerAutoReset;
                    if (circuitBreakerRecoveryCount >= effectiveReset) {
                        circuitBreakerTripped = false;
                        circuitBreakerCount = 0;
                        circuitBreakerRecoveryCount = 0;
                        emit CircuitBreakerAutoReset(effectiveReset);
                    }
                } else {
                    circuitBreakerRecoveryCount = 0;
                }
            } else {
                circuitBreakerCount = 0;
            }

            // Only mint supplemental if:
            // 1. Price > NAV (premium exists)
            // 2. Circuit breaker not tripped
            // 3. Staking ratio > 50% (don't amplify APY during stress exodus)
            uint256 stakingRatioBps = stRootsSupply > 0
                ? (stRootsSupply * BPS_DENOMINATOR) / totalRootsSupply
                : 0;
            if (twapRoots > navPerRoots && !circuitBreakerTripped && stakingRatioBps > stakingRatioGateBps) {
                uint256 premiumBps = ((twapRoots * BPS_DENOMINATOR) / navPerRoots);
                // NOTE: Supplemental mint is based on totalRootsSupply (not stRootsSupply),
                // matching the reference Olympus DAO Distributor design
                // (OHM.totalSupply() * rate — see StakingDistributor.sol nextRewardAt()).
                // This ensures per-staker APY = supplementalMint / stRootsSupply naturally
                // declines as the staking ratio rises, since a fixed-size reward pool
                // (proportional to total supply) is split among more stakers.
                // Using stRootsSupply here would make per-staker APY constant regardless
                // of staking ratio, which is economically incorrect.
                if (premiumBps >= kBps) {
                    supplementalMint = (totalRootsSupply * rMax) / BPS_DENOMINATOR;
                } else {
                    uint256 excessBps = premiumBps - BPS_DENOMINATOR;
                    uint256 rangeBps = kBps - BPS_DENOMINATOR;
                    supplementalMint = (totalRootsSupply * rMax * excessBps) / (rangeBps * BPS_DENOMINATOR);
                }

                // NAV warmup ramp: scale supplemental from 0→100% over navWarmupEpochs.
                // Prevents massive mints when navPerRoots is tiny at launch, which
                // would make premiumBps enormous and trigger max supplemental.
                if (navWarmupEpochs > 0 && epochData.number < navWarmupEpochs) {
                    supplementalMint = (supplementalMint * epochData.number) / navWarmupEpochs;
                }

                if (address(treasuryPolicy) != address(0)) {
                    uint256 newRootsSupply = totalRootsSupply + supplementalMint;
                    try treasuryPolicy.enforceRfvInvariant(newRootsSupply) {
                        // RFV invariant passed — full supplemental mint
                    } catch {
                        // Check if backing ratio is between 90-100% — scale proportionally
                        uint256 rfv = ITreasuryPolicy(address(treasuryPolicy)).rfv();
                        uint256 floorP = ITreasuryPolicy(address(treasuryPolicy)).floorPrice();
                        if (rfv > 0 && floorP > 0) {
                            uint256 requiredRfv = newRootsSupply * floorP / 1e18;
                            uint256 backingRatioBps = (rfv * BPS_DENOMINATOR) / requiredRfv;
                            if (backingRatioBps >= 9000 && backingRatioBps < BPS_DENOMINATOR) {
                                // Scale supplemental proportionally to remaining headroom
                                supplementalMint = supplementalMint * (backingRatioBps - 9000) / 1000;
                            } else {
                                supplementalMint = 0;
                            }
                        } else {
                            supplementalMint = 0;
                        }
                    }
                }

                // Rate limiter: cap cumulative supplemental per 30-epoch window at 5% of total supply
                // Only active after suppWarmupEpochs (10 days) to allow higher initial APY
                // Uses totalRootsSupply (not stRootsSupply) for consistency with the mint formula
                if (epochData.number >= suppWarmupEpochs) {
                    if (epochData.number - suppWindowStartEpoch >= suppRateLimitWindow) {
                        suppWindowStartEpoch = epochData.number;
                        suppWindowMinted = 0;
                    }
                    uint256 windowCap = (totalRootsSupply * suppRateLimitCapBps) / BPS_DENOMINATOR;
                    uint256 remainingCap = windowCap > suppWindowMinted ? windowCap - suppWindowMinted : 0;
                    if (supplementalMint > remainingCap) {
                        supplementalMint = remainingCap;
                    }
                }

                if (supplementalMint > 0) {
                    // Reward smoothing: divert a portion to buffer during good times
                    uint256 toBuffer = (supplementalMint * smoothingDivertBps) / BPS_DENOMINATOR;
                    uint256 bufferCap = (totalRootsSupply * smoothingBufferCapBps) / BPS_DENOMINATOR;
                    if (smoothingBuffer + toBuffer > bufferCap) {
                        toBuffer = bufferCap > smoothingBuffer ? bufferCap - smoothingBuffer : 0;
                    }
                    if (toBuffer > 0) {
                        supplementalMint -= toBuffer;
                        smoothingBuffer += toBuffer;
                        emit SmoothingBufferDeposited(toBuffer, smoothingBuffer);
                    }

                    if (supplementalMint > 0) {
                        newIndexNumerator = (contractBalance + supplementalMint) * 1e18;
                        newIndex = newIndexNumerator / stRootsSupply;
                        totalSupplementalMinted += supplementalMint;
                        suppWindowMinted += supplementalMint;
                    }
                }
            }
        }

        // Reward smoothing: draw from buffer during low/no-premium epochs
        // Bypasses circuit breaker and RFV check — these are deferred rewards that already passed checks
        if (supplementalMint == 0 && smoothingBuffer > 0) {
            uint256 fromBuffer = (totalRootsSupply * smoothingFloorBps) / BPS_DENOMINATOR;
            if (fromBuffer > smoothingBuffer) {
                fromBuffer = smoothingBuffer;
            }
            if (fromBuffer > 0) {
                smoothingBuffer -= fromBuffer;
                supplementalMint = fromBuffer;
                newIndexNumerator = (contractBalance + supplementalMint) * 1e18;
                newIndex = newIndexNumerator / stRootsSupply;
                totalSupplementalMinted += supplementalMint;
                emit SmoothingBufferDrawn(fromBuffer, smoothingBuffer);
            }
        }

        // Cap rebase rate to prevent overflow when stRootsSupply is very low
        if (lastIndex > 0) {
            // Compute rebase rate from un-divided numerator to avoid divide-before-multiply:
            // rebaseRateBps = (newIndex / lastIndex) * BPS_DENOMINATOR - BPS_DENOMINATOR
            //               = (newIndexNumerator / stRootsSupply / lastIndex) * BPS_DENOMINATOR - BPS_DENOMINATOR
            //               = (newIndexNumerator * BPS_DENOMINATOR) / (stRootsSupply * lastIndex) - BPS_DENOMINATOR
            uint256 rebaseRateBps = (newIndexNumerator * BPS_DENOMINATOR) / (stRootsSupply * lastIndex) - BPS_DENOMINATOR;
            if (rebaseRateBps > rebaseRateCapBps) {
                // Cap the rebase rate — compute from lastIndex directly (multiply before divide)
                newIndex = lastIndex + (lastIndex * rebaseRateCapBps) / BPS_DENOMINATOR;
                newIndexNumerator = newIndex * stRootsSupply;
            }
        }

        epochData.distribute = supplementalMint;
        lastIndex = newIndex;
        ++epochData.number;
        epochData.end = block.timestamp + epochData.length;

        emit Rebased(newIndex, contractBalance, supplementalMint);
    }

    /// @notice Reset circuit breaker — only multisig can reset after tripping
    /// @dev Can also auto-reset after CIRCUIT_BREAKER_AUTO_RESET consecutive epochs above floor.
    ///      Manual reset forces the team to acknowledge the issue before resuming inflation.
    function resetCircuitBreaker() external onlyMultisig {
        circuitBreakerTripped = false;
        circuitBreakerCount = 0;
        circuitBreakerRecoveryCount = 0;
        emit CircuitBreakerReset();
    }

    /// @notice Emergency pause — stops staking, unstaking, and rebasing (TempleDAO lesson)
    function pause() external onlyMultisig {
        _pause();
    }

    /// @notice Unpause — resume normal operations
    function unpause() external onlyMultisig {
        _unpause();
    }

    /// @notice Get current stROOTS per ROOTS exchange rate (Olympus V3 IStaking.index)
    function index() external view returns (uint256) {
        return lastIndex;
    }

    /// @notice Get pending rebase info
    function pendingRebase() external view returns (bool canRebase, uint256 nextEpochEnd) {
        return (block.timestamp >= epochData.end, epochData.end);
    }

    /// @notice Seconds to next epoch (Olympus V3 IStaking.secondsToNextEpoch)
    function secondsToNextEpoch() external view returns (uint256) {
        if (block.timestamp >= epochData.end) return 0;
        return epochData.end - block.timestamp;
    }

    /// @notice Get epoch info as tuple (Olympus V3 IStaking.epoch)
    function epoch() external view returns (uint256, uint256, uint256, uint256) {
        return (epochData.length, epochData.number, epochData.end, epochData.distribute);
    }

    /// @dev Olympus V3 Distributor.nextRewardFor pattern
    function nextRewardFor(address who_) public view returns (uint256) {
        return (IERC20(address(rootsToken)).balanceOf(who_) * rewardRate) / BPS_DENOMINATOR;
    }
}
