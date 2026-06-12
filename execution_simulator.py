"""
Execution Simulator: Monte Carlo price paths, VWAP/TWAP/AC schedules,
market microstructure noise, and impact decay.
"""
import numpy as np
from impact_models import (
    square_root_impact, temporary_impact, permanent_impact,
    optimal_trajectory,
)


def simulate_execution(
    order_size: float,
    adv: float,
    participation_rate: float,
    volatility: float,
    risk_aversion: float,
    steps: int = 100,
    n_paths: int = 200,
    seed: int = 42,
    strategy: str = "AC",
) -> dict:
    """
    Simulate execution price paths under three strategies:
      - TWAP  : equal slices over time
      - VWAP  : volume-weighted schedule (U-shaped)
      - AC    : Almgren-Chriss optimal trajectory

    Returns a dict with:
        prices         – (steps+1,) baseline GBM path
        impacted_mean  – (steps+1,) mean impacted path across n_paths
        impacted_band  – (steps+1, 2) [5th, 95th] percentile band
        schedule       – (steps+1,) shares traded per step
        pnl_distribution – (n_paths,) final implementation shortfall per path
        strategy        – string label
    """
    rng = np.random.default_rng(seed)
    dt = 1.0 / steps
    S0 = 100.0

    # ── Build execution schedule ─────────────────────────────────────────────
    if strategy == "TWAP":
        shares_per_step = np.full(steps, order_size / steps)
    elif strategy == "VWAP":
        # U-shaped intraday volume profile
        t = np.linspace(0, 1, steps)
        volume_profile = 1.5 - np.cos(2 * np.pi * t)
        volume_profile /= volume_profile.sum()
        shares_per_step = order_size * volume_profile
    else:  # AC optimal
        traj = optimal_trajectory(order_size, adv, volatility, risk_aversion, steps)
        shares_per_step = np.diff(-traj)          # shares sold each step
        shares_per_step = np.maximum(shares_per_step, 0)

    schedule = np.concatenate([[order_size], order_size - np.cumsum(shares_per_step)])

    # ── Monte Carlo simulation ───────────────────────────────────────────────
    dW = rng.standard_normal((n_paths, steps))     # (paths, steps)

    # Baseline GBM (no impact)
    log_returns = (volatility ** 2 / 2) * dt + volatility * np.sqrt(dt) * dW
    log_price = np.concatenate(
        [np.zeros((n_paths, 1)), np.cumsum(log_returns, axis=1)], axis=1
    )
    all_prices = S0 * np.exp(log_price)            # (paths, steps+1)

    # Impact overlay
    temp_imp = temporary_impact(order_size, adv, participation_rate)
    perm_imp = permanent_impact(order_size, adv)
    sqrt_imp = square_root_impact(order_size, adv, volatility)

    # Decay: temporary impact dissipates, permanent stays
    decay = np.exp(-np.linspace(0, 5, steps + 1))         # fast decay
    total_impact = (temp_imp + sqrt_imp) * decay + perm_imp * (1 - decay * 0.2)

    impacted_all = all_prices - total_impact[np.newaxis, :]   # broadcast

    # Per-path implementation shortfall (bps)
    is_paths = (impacted_all[:, -1] - S0) * order_size       # (n_paths,)

    # Mean and percentile band
    impacted_mean = impacted_all.mean(axis=0)
    impacted_lo   = np.percentile(impacted_all, 5, axis=0)
    impacted_hi   = np.percentile(impacted_all, 95, axis=0)

    # Single representative baseline path (median)
    median_idx = np.argsort(all_prices[:, -1])[n_paths // 2]
    prices = all_prices[median_idx]

    return dict(
        prices=prices,
        impacted_mean=impacted_mean,
        impacted_band=np.stack([impacted_lo, impacted_hi], axis=1),
        schedule=schedule,
        pnl_distribution=is_paths,
        strategy=strategy,
        steps=steps,
    )
