// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {IDistributor} from "@olympus-v3/policies/interfaces/IDistributor.sol";
import {IStaking} from "@olympus-v3/interfaces/IStaking.sol";
import {RootsStaking} from "./RootsStaking.sol";

/// @title RootsDistributor
/// @notice Minimal distributor that bridges Olympus Heart to RootsStaking's rebase.
/// @dev The Olympus Heart calls `distributor.triggerRebase()` on each beat.
///      RootsStaking handles its own reward distribution (harvest yield + supplemental emissions),
///      so this distributor simply delegates the rebase call. No MINTR or TRSRY dependencies needed.
///      The `staking()` getter returns the StakingAdapter (IStaking) so the Heart can sync
///      beat frequency with the staking epoch.
contract RootsDistributor is IDistributor {
    /// @notice RootsStaking contract that performs the actual rebase
    RootsStaking public immutable rootsStaking;

    /// @notice StakingAdapter implementing IStaking for Heart epoch sync
    IStaking public immutable stakingAdapter;

    constructor(address rootsStaking_, address stakingAdapter_) {
        if (rootsStaking_ == address(0) || stakingAdapter_ == address(0))
            revert("ZeroAddress");
        rootsStaking = RootsStaking(rootsStaking_);
        stakingAdapter = IStaking(stakingAdapter_);
    }

    /// @inheritdoc IDistributor
    /// @dev Calls RootsStaking.rebase() which reverts if not at epoch end.
    ///      The Heart's beat frequency must match the staking epoch length (8 hours).
    function triggerRebase() external override {
        rootsStaking.rebase();
    }

    /// @inheritdoc IDistributor
    /// @dev No-op: RootsStaking handles reward distribution internally via its rebase logic.
    function distribute() external override {}

    /// @inheritdoc IDistributor
    /// @dev Returns 0 — no bounty system in Rooted Finance.
    function retrieveBounty() external override returns (uint256) {
        return 0;
    }

    /// @inheritdoc IDistributor
    function staking() external view override returns (IStaking) {
        return stakingAdapter;
    }
}
