// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStaking} from "@olympus-v3/interfaces/IStaking.sol";
import {WstROOTS} from "./wstROOTS.sol";
import {RootsStaking} from "./RootsStaking.sol";

/// @title StakingAdapter
/// @notice Implements Olympus V3 IStaking by bridging to Rooted Finance's real staking contracts.
/// @dev MonoCooler calls IStaking.unstake() to unwrap WSTROOTS → stROOTS → ROOTS.
///      This adapter delegates to WstROOTS.unwrap() and RootsStaking.unstake().
contract StakingAdapter is IStaking {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error InsufficientAmount();

    address public immutable OHM;
    address public immutable sOHM;
    address public immutable gOHM;

    WstROOTS public immutable wstRoots;
    RootsStaking public immutable staking;

    constructor(address roots_, address stRoots_, address wstRoots_) {
        if (roots_ == address(0) || stRoots_ == address(0) || wstRoots_ == address(0)) revert ZeroAddress();
        OHM = roots_;
        sOHM = stRoots_;
        gOHM = wstRoots_;
        wstRoots = WstROOTS(wstRoots_);
        staking = RootsStaking(stRoots_);
    }

    function index() external view override returns (uint256) {
        return staking.index();
    }

    function supplyInWarmup() external pure override returns (uint256) {
        return 0;
    }

    function rebase() external override returns (uint256) {
        return 0;
    }

    /// @notice Stake ROOTS → stROOTS (rebasing=true) or wstROOTS (rebasing=false)
    function stake(address to_, uint256 amount_, bool rebasing_, bool) external override returns (uint256) {
        if (amount_ == 0) revert InsufficientAmount();
        IERC20(OHM).safeTransferFrom(msg.sender, address(this), amount_);
        IERC20(OHM).forceApprove(address(staking), amount_);
        uint256 stRootsAmount = staking.stake(amount_);
        if (rebasing_) {
            IERC20(sOHM).safeTransfer(to_, stRootsAmount);
            return stRootsAmount;
        } else {
            IERC20(sOHM).forceApprove(address(wstRoots), stRootsAmount);
            uint256 wstRootsAmount = wstRoots.wrap(stRootsAmount);
            IERC20(gOHM).safeTransfer(to_, wstRootsAmount);
            return wstRootsAmount;
        }
    }

    /// @notice Unstake stROOTS (rebasing=true) or wstROOTS (rebasing=false) → ROOTS
    function unstake(address to_, uint256 amount_, bool, bool rebasing_) external override returns (uint256) {
        if (amount_ == 0) revert InsufficientAmount();
        uint256 stRootsAmount;
        if (rebasing_) {
            IERC20(sOHM).safeTransferFrom(msg.sender, address(this), amount_);
            stRootsAmount = amount_;
        } else {
            IERC20(gOHM).safeTransferFrom(msg.sender, address(this), amount_);
            stRootsAmount = wstRoots.unwrap(amount_);
        }
        uint256 rootsAmount = staking.unstake(stRootsAmount);
        IERC20(OHM).safeTransfer(to_, rootsAmount);
        return rootsAmount;
    }

    /// @notice Wrap stROOTS → wstROOTS
    function wrap(address to_, uint256 amount_) external returns (uint256) {
        if (amount_ == 0) revert InsufficientAmount();
        IERC20(sOHM).safeTransferFrom(msg.sender, address(this), amount_);
        IERC20(sOHM).forceApprove(address(wstRoots), amount_);
        uint256 wstRootsAmount = wstRoots.wrap(amount_);
        IERC20(gOHM).safeTransfer(to_, wstRootsAmount);
        return wstRootsAmount;
    }

    /// @notice Unwrap wstROOTS → stROOTS (not to ROOTS)
    function unwrap(address to_, uint256 amount_) external returns (uint256) {
        if (amount_ == 0) revert InsufficientAmount();
        IERC20(gOHM).safeTransferFrom(msg.sender, address(this), amount_);
        uint256 stRootsAmount = wstRoots.unwrap(amount_);
        IERC20(sOHM).safeTransfer(to_, stRootsAmount);
        return stRootsAmount;
    }

    function setDistributor(address) external override {}

    function secondsToNextEpoch() external view override returns (uint256) {
        return staking.secondsToNextEpoch();
    }

    function epoch() external view override returns (uint256, uint256, uint256, uint256) {
        return staking.epoch();
    }
}
