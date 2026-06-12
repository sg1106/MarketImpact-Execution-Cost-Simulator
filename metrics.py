"""
Metrics: slippage, execution cost, implementation shortfall, risk-adjusted cost,
market impact decomposition, and efficiency ratios.
"""
import numpy as np
from impact_models import (
    square_root_impact, temporary_impact, permanent_impact,
    kyle_lambda_impact, three_fifths_impact,
)


# ── Core Metrics ─────────────────────────────────────────────────────────────

def expected_slippage(order_size, adv, participation_rate, volatility):
    """Total expected slippage = sqrt impact + temporary impact."""
    return (
        square_root_impact(order_size, adv, volatility)
        + temporary_impact(order_size, adv, participation_rate)
    )


def execution_cost(order_size, adv, participation_rate, volatility):
    """Total dollar execution cost."""
    return expected_slippage(order_size, adv, participation_rate, volatility) * order_size


def implementation_shortfall(order_size, adv, participation_rate, volatility,
                             benchmark_price, executed_price):
    """Implementation shortfall vs. arrival price."""
    price_diff = executed_price - benchmark_price
    return price_diff * order_size


def risk_adjusted_cost(cost, risk_aversion, volatility, order_size=1, adv=1):
    """
    Risk-adjusted total cost incorporating variance penalty.
    cost + λ * σ² * (Q/ADV)
    """
    variance_penalty = risk_aversion * (volatility ** 2) * (order_size / max(adv, 1))
    return cost + variance_penalty


# ── Decomposition ─────────────────────────────────────────────────────────────

def cost_decomposition(order_size, adv, participation_rate, volatility, risk_aversion):
    """
    Break down total cost into components.
    Returns dict with keys: temporary, permanent, spread, timing_risk.
    """
    temp    = temporary_impact(order_size, adv, participation_rate) * order_size
    perm    = permanent_impact(order_size, adv) * order_size
    spread  = 0.001 * order_size                     # assumed 10bps half-spread
    t_risk  = risk_aversion * volatility * order_size * np.sqrt(order_size / adv)
    return dict(Temporary=temp, Permanent=perm, Spread=spread, TimingRisk=t_risk)


# ── Efficiency & Model Comparison ─────────────────────────────────────────────

def model_comparison(order_size, adv, participation_rate, volatility):
    """
    Compare slippage estimates across models.
    Returns dict {model_name: slippage_value}.
    """
    return {
        "Almgren-Chriss √":  square_root_impact(order_size, adv, volatility),
        "Kyle λ (Linear)":   kyle_lambda_impact(order_size, adv, volatility),
        "3/5 Power Law":     three_fifths_impact(order_size, adv, volatility),
        "Temporary Only":    temporary_impact(order_size, adv, participation_rate),
        "Permanent Only":    permanent_impact(order_size, adv),
    }


def market_impact_bps(order_size, adv, participation_rate, volatility):
    """Return expected slippage in basis points (per unit price of 100)."""
    slip = expected_slippage(order_size, adv, participation_rate, volatility)
    return slip * 10_000 / 100.0


def participation_sensitivity(order_size, adv, volatility, n=50):
    """Slippage vs. participation rate curve."""
    rates = np.linspace(0.01, 1.0, n)
    slips = [expected_slippage(order_size, adv, r, volatility) for r in rates]
    return rates, np.array(slips)


def size_sensitivity(adv, participation_rate, volatility, n=50):
    """Slippage vs. order size curve."""
    sizes = np.linspace(0.001 * adv, 0.5 * adv, n)
    slips = [expected_slippage(s, adv, participation_rate, volatility) for s in sizes]
    return sizes, np.array(slips)
