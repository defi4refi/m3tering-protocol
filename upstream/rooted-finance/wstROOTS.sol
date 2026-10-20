// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title wstROOTS
/// @notice Non-rebasing wrapper for stROOTS, based on Lido WstETH pattern (Apache-2.0)
/// @dev Fixed balance — compatible with collateral systems (Cooler, Morpho, DSS, Pendle).
///      Pattern: https://github.com/lidofinance/lido-dao/blob/master/contracts/0.6.12/WstETH.sol
contract WstROOTS is ERC20Permit {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error InsufficientAmount();

    IERC20 public immutable stROOTS;

    constructor(address _stRoots) ERC20("Wrapped staked ROOTS", "wstROOTS") ERC20Permit("Wrapped staked ROOTS") {
        if (_stRoots == address(0)) revert ZeroAddress();
        stROOTS = IERC20(_stRoots);
    }

    /// @notice Wrap stROOTS into wstROOTS
    function wrap(uint256 _stRootsAmount) external returns (uint256) {
        if (_stRootsAmount == 0) revert InsufficientAmount();
        uint256 wstRootsAmount = stRootsToWstRoots(_stRootsAmount);
        _mint(msg.sender, wstRootsAmount);
        stROOTS.safeTransferFrom(msg.sender, address(this), _stRootsAmount);
        return wstRootsAmount;
    }

    /// @notice Unwrap wstROOTS back to stROOTS
    function unwrap(uint256 _wstRootsAmount) external returns (uint256) {
        if (_wstRootsAmount == 0) revert InsufficientAmount();
        uint256 stRootsAmount = wstRootsToStRoots(_wstRootsAmount);
        _burn(msg.sender, _wstRootsAmount);
        stROOTS.safeTransfer(msg.sender, stRootsAmount);
        return stRootsAmount;
    }

    /// @notice Get amount of wstROOTS for a given stROOTS amount
    function stRootsToWstRoots(uint256 _stRootsAmount) public view returns (uint256) {
        if (totalSupply() == 0) return _stRootsAmount;
        return (_stRootsAmount * totalSupply()) / stROOTS.totalSupply();
    }

    /// @notice Get amount of stROOTS for a given wstROOTS amount
    function wstRootsToStRoots(uint256 _wstRootsAmount) public view returns (uint256) {
        uint256 totalStRoots = stROOTS.totalSupply();
        if (totalSupply() == 0) return _wstRootsAmount;
        return (_wstRootsAmount * totalStRoots) / totalSupply();
    }

    /// @notice Get stROOTS per wstROOTS
    function stRootsPerToken() external view returns (uint256) {
        if (totalSupply() == 0) return 1e18;
        return (stROOTS.totalSupply() * 1e18) / totalSupply();
    }
}
