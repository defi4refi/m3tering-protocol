"""
Floor Hook Model for Rooted Finance (ROOTS)

Mirrors the logic in contracts/src/dex/RootsFloorHook.sol:
- Monotone redemption floor via Uniswap V4 hook
- 50% of buy net USDC → floor reserve, 50% → band reserve
- 70% of swap fees → floor reserve
- Sells: ROOTS absorbed into hook (excluded from redeemable supply → floor rises)
- Redemption at floor price (less 1% fee), ROOTS burned
- Floor = floorReserve / (totalSupply - hookRootsBalance)
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional

# ─── Contract Constants (from RootsFloorHook.sol) ───
REDEMPTION_FEE_BPS = 100       # 1%
FLOOR_RESERVE_BPS = 5000       # 50% of buy net USDC → floor
BAND_RESERVE_BPS = 5000        # 50% of buy net USDC → band
FEE_TO_FLOOR_BPS = 7000        # 70% of fee → floor
BUY_FEE_BPS = 100              # 1% hook buy fee → floor reserve
SELL_FEE_BPS = 100             # 1% hook sell fee → extra ROOTS absorbed
ASSET_HAIRCUT_DEFAULT_BPS = 8000  # 80% default haircut for non-quote assets
BASIS_POINTS = 10000
ONE_E18 = 1e18


@dataclass
class FloorHookParams:
    """Configurable parameters for floor hook simulation."""
    # Reserve split
    floor_reserve_bps: float = FLOOR_RESERVE_BPS
    band_reserve_bps: float = BAND_RESERVE_BPS
    fee_to_floor_bps: float = FEE_TO_FLOOR_BPS
    redemption_fee_bps: float = REDEMPTION_FEE_BPS

    # Initial conditions
    initial_total_supply: float = 1_000_000.0      # ROOTS total supply
    initial_floor_reserve: float = 0.0              # USDC in floor reserve — starts at 0
    initial_band_reserve: float = 0.0               # USDC in band reserve — starts at 0
    initial_hook_roots: float = 0.0                 # ROOTS absorbed by hook

    # Pool params
    initial_pool_roots: float = 200_000.0           # ROOTS in V4 pool
    initial_pool_usdc: float = 2_000_000.0          # USDC in V4 pool
    swap_fee_bps: float = 30                        # 0.3% pool swap fee
    buy_fee_bps: float = BUY_FEE_BPS                 # 1% hook buy fee → floor
    sell_fee_bps: float = SELL_FEE_BPS               # 1% hook sell fee → extra absorbed
    asset_haircut_bps: float = ASSET_HAIRCUT_DEFAULT_BPS  # 80% haircut for non-quote assets

    # Simulation
    num_epochs: int = 90
    random_seed: Optional[int] = 42

    # Trading activity (per epoch)
    base_buy_volume_usdc: float = 100_000.0         # Average buy volume per epoch
    base_sell_volume_roots: float = 5_000.0         # Average sell volume per epoch
    volume_volatility: float = 0.5                  # Volatility of trading volume

    # Redemption behavior
    redemption_probability: float = 0.1             # Chance of redemption event per epoch
    redemption_size_pct: float = 0.05               # % of redeemable supply redeemed


@dataclass
class FloorHookState:
    """Mutable floor hook state."""
    total_roots_supply: float
    floor_reserve: float
    band_reserve: float
    hook_roots_balance: float
    pool_roots: float
    pool_usdc: float
    floor_price: float = 0.0
    reserve_floor: float = 0.0  # Hook's own reserve-backed floor (actual payout capacity)
    redeemable_supply: float = 0.0
    epoch: int = 0
    total_usdc_to_floor: float = 0.0
    total_usdc_to_band: float = 0.0
    total_roots_absorbed: float = 0.0
    total_roots_redeemed: float = 0.0
    total_usdc_paid_out: float = 0.0
    total_fees_collected: float = 0.0
    max_floor_price: float = 0.0  # Monotone floor — never decreases


def compute_floor(state: FloorHookState) -> float:
    """
    Floor = floorReserve / (totalSupply - hookRootsBalance)
    Monotone: floor only increases when:
    - Buy USDC flows to floor reserve
    - Sells absorb ROOTS (reducing redeemable supply)
    - Fees flow to floor
    """
    redeemable = state.total_roots_supply - state.hook_roots_balance
    if redeemable <= 0:
        return state.max_floor_price  # Return previous floor if no redeemable supply
    raw_floor = state.floor_reserve / redeemable
    # Monotone floor: never decreases below its historical max
    state.max_floor_price = max(state.max_floor_price, raw_floor)
    return state.max_floor_price


def simulate_floor_hook(params: FloorHookParams) -> pd.DataFrame:
    """
    Run floor hook simulation.
    Models swap activity, reserve accumulation, ROOTS absorption, and redemptions.
    """
    rng = np.random.default_rng(params.random_seed)

    state = FloorHookState(
        total_roots_supply=params.initial_total_supply,
        floor_reserve=params.initial_floor_reserve,
        band_reserve=params.initial_band_reserve,
        hook_roots_balance=params.initial_hook_roots,
        pool_roots=params.initial_pool_roots,
        pool_usdc=params.initial_pool_usdc,
    )

    state.floor_price = compute_floor(state)
    state.redeemable_supply = state.total_roots_supply - state.hook_roots_balance

    records = []

    for epoch in range(params.num_epochs):
        state.epoch = epoch

        # ─── 1. Simulate buy activity (USDC → ROOTS) ───
        buy_volume = max(0, rng.normal(
            params.base_buy_volume_usdc,
            params.base_buy_volume_usdc * params.volume_volatility
        ))

        if buy_volume > 0 and state.pool_roots > 0:
            # Constant product swap: USDC in → ROOTS out
            k = state.pool_roots * state.pool_usdc
            new_pool_usdc = state.pool_usdc + buy_volume
            new_pool_roots = k / new_pool_usdc
            roots_out = state.pool_roots - new_pool_roots

            # Update pool
            state.pool_usdc = new_pool_usdc
            state.pool_roots = new_pool_roots

            # ROOTS bought from pool re-enter circulation — release from hook balance
            if state.hook_roots_balance > 0:
                release = min(roots_out, state.hook_roots_balance)
                state.hook_roots_balance -= release

            # Swap fee
            fee = buy_volume * params.swap_fee_bps / BASIS_POINTS
            state.total_fees_collected += fee

            # Net USDC (after fee) split to reserves
            net_usdc = buy_volume - fee
            to_floor = net_usdc * params.floor_reserve_bps / BASIS_POINTS
            to_band = net_usdc * params.band_reserve_bps / BASIS_POINTS

            # Fee split: 70% to floor
            fee_to_floor = fee * params.fee_to_floor_bps / BASIS_POINTS

            state.floor_reserve += to_floor + fee_to_floor
            state.band_reserve += to_band
            state.total_usdc_to_floor += to_floor + fee_to_floor
            state.total_usdc_to_band += to_band

        # ─── 2. Simulate sell activity (ROOTS → USDC) ───
        sell_volume = max(0, rng.normal(
            params.base_sell_volume_roots,
            params.base_sell_volume_roots * params.volume_volatility
        ))

        if sell_volume > 0 and state.pool_usdc > 0:
            # Constant product swap: ROOTS in → USDC out
            k = state.pool_roots * state.pool_usdc
            new_pool_roots = state.pool_roots + sell_volume
            new_pool_usdc = k / new_pool_roots
            usdc_out = state.pool_usdc - new_pool_usdc

            # Update pool
            state.pool_roots = new_pool_roots
            state.pool_usdc = new_pool_usdc

            # ROOTS absorbed by hook (not returned to circulation)
            state.hook_roots_balance += sell_volume
            state.total_roots_absorbed += sell_volume

        # ─── 3. Simulate redemptions ───
        state.redeemable_supply = state.total_roots_supply - state.hook_roots_balance
        state.floor_price = compute_floor(state)

        if rng.random() < params.redemption_probability and state.redeemable_supply > 0:
            redeem_amount = min(
                state.redeemable_supply * params.redemption_size_pct,
                state.redeemable_supply
            )

            gross_payout = redeem_amount * state.floor_price
            fee = gross_payout * params.redemption_fee_bps / BASIS_POINTS
            net_payout = gross_payout - fee

            if net_payout <= state.floor_reserve:
                # Execute redemption
                state.floor_reserve -= net_payout
                state.hook_roots_balance += redeem_amount  # ROOTS burned (absorbed)
                state.total_roots_redeemed += redeem_amount
                state.total_usdc_paid_out += net_payout
                # Fee stays in floor reserve
                state.floor_reserve += fee

        # ─── 4. Update derived values ───
        state.redeemable_supply = state.total_roots_supply - state.hook_roots_balance
        state.floor_price = compute_floor(state)

        # ─── 4b. FLOOR HOOK BUYBACK: if pool price < floor, use floor reserve to buy ROOTS ───
        pool_price = state.pool_usdc / state.pool_roots if state.pool_roots > 0 else 0
        if pool_price < state.floor_price and state.floor_reserve > 0 and state.pool_roots > 0:
            k = state.pool_roots * state.pool_usdc
            target_pool_roots = (k / state.floor_price) ** 0.5
            target_pool_usdc = k / target_pool_roots
            usdc_needed = target_pool_usdc - state.pool_usdc
            max_buyback = state.floor_reserve * 0.05
            usdc_to_spend = min(usdc_needed, max_buyback)
            if usdc_to_spend > 0:
                new_pool_usdc = state.pool_usdc + usdc_to_spend
                new_pool_roots = k / new_pool_usdc
                roots_bought = state.pool_roots - new_pool_roots
                state.pool_usdc = new_pool_usdc
                state.pool_roots = new_pool_roots
                state.floor_reserve -= usdc_to_spend
                state.hook_roots_balance += roots_bought
                state.total_roots_absorbed += roots_bought

        # Market price from pool
        market_price = state.pool_usdc / state.pool_roots if state.pool_roots > 0 else 0

        # Premium/discount to floor
        premium_to_floor = ((market_price / state.floor_price) - 1) * 100 if state.floor_price > 0 else 0

        records.append({
            'epoch': epoch,
            'day': epoch / 3,
            'floor_price': state.floor_price,
            'market_price': market_price,
            'premium_to_floor_pct': premium_to_floor,
            'floor_reserve': state.floor_reserve,
            'band_reserve': state.band_reserve,
            'hook_roots_balance': state.hook_roots_balance,
            'redeemable_supply': state.redeemable_supply,
            'total_roots_supply': state.total_roots_supply,
            'pool_roots': state.pool_roots,
            'pool_usdc': state.pool_usdc,
            'total_usdc_to_floor': state.total_usdc_to_floor,
            'total_usdc_to_band': state.total_usdc_to_band,
            'total_roots_absorbed': state.total_roots_absorbed,
            'total_roots_redeemed': state.total_roots_redeemed,
            'total_usdc_paid_out': state.total_usdc_paid_out,
            'total_fees_collected': state.total_fees_collected,
        })

    return pd.DataFrame(records)


def simulate_mass_redemption(
    params: FloorHookParams,
    redemption_pct: float = 0.50,
) -> pd.DataFrame:
    """
    Stress test: simulate mass redemption of redemption_pct of redeemable supply.
    Shows floor impact as redemptions cascade.
    """
    rng = np.random.default_rng(params.random_seed)

    state = FloorHookState(
        total_roots_supply=params.initial_total_supply,
        floor_reserve=params.initial_floor_reserve,
        band_reserve=params.initial_band_reserve,
        hook_roots_balance=params.initial_hook_roots,
        pool_roots=params.initial_pool_roots,
        pool_usdc=params.initial_pool_usdc,
    )

    state.floor_price = compute_floor(state)
    state.redeemable_supply = state.total_roots_supply - state.hook_roots_balance

    total_to_redeem = state.redeemable_supply * redemption_pct
    batch_size = total_to_redeem / 20  # Redeem in 20 batches

    records = []

    for batch in range(20):
        redeem_amount = min(batch_size, state.redeemable_supply)
        if redeem_amount <= 0:
            break

        gross_payout = redeem_amount * state.floor_price
        fee = gross_payout * params.redemption_fee_bps / BASIS_POINTS
        net_payout = gross_payout - fee

        if net_payout > state.floor_reserve:
            net_payout = state.floor_reserve  # Drain remaining
            redeem_amount = net_payout / state.floor_price if state.floor_price > 0 else 0

        state.floor_reserve -= net_payout
        state.hook_roots_balance += redeem_amount
        state.total_roots_redeemed += redeem_amount
        state.total_usdc_paid_out += net_payout
        state.floor_reserve += fee

        state.redeemable_supply = state.total_roots_supply - state.hook_roots_balance
        state.floor_price = compute_floor(state)

        records.append({
            'batch': batch,
            'roots_redeemed': redeem_amount,
            'usdc_paid_out': net_payout,
            'floor_reserve_remaining': state.floor_reserve,
            'floor_price': state.floor_price,
            'redeemable_supply': state.redeemable_supply,
            'pct_redeemed': state.total_roots_redeemed / (params.initial_total_supply - params.initial_hook_roots) * 100,
        })

    return pd.DataFrame(records)
