"""
Market Impact Models: Almgren-Chriss, Square-root, Temporary, Permanent, Kyle Lambda
"""
import numpy as np


# ── Almgren-Chriss Framework ────────────────────────────────────────────────

def square_root_impact(order_size: float, adv: float, volatility: float,
                       impact_coeff: float = 0.5) -> float:
    """Almgren-Chriss square-root permanent impact."""
    return impact_coeff * volatility * np.sqrt(order_size / adv)


def temporary_impact(order_size: float, adv: float, participation_rate: float,
                     temp_coeff: float = 0.1) -> float:
    """Temporary (transient) impact — decays after execution."""
    return temp_coeff * (order_size / adv) ** 0.5 * participation_rate


def permanent_impact(order_size: float, adv: float,
                     perm_coeff: float = 0.05) -> float:
    """Permanent price impact — does not revert."""
    return perm_coeff * (order_size / adv)


# ── Kyle Lambda (Linear) ────────────────────────────────────────────────────

def kyle_lambda_impact(order_size: float, adv: float, volatility: float,
                       lambda_coeff: float = 0.3) -> float:
    """Kyle (1985) linear price impact model."""
    return lambda_coeff * volatility * (order_size / adv)


# ── Three-Fifths Power Law ──────────────────────────────────────────────────

def three_fifths_impact(order_size: float, adv: float, volatility: float,
                        coeff: float = 0.6) -> float:
    """Three-fifths power law (empirical institutional variant)."""
    return coeff * volatility * (order_size / adv) ** (3 / 5)


# ── Optimal Execution Schedule (Almgren-Chriss) ─────────────────────────────

def optimal_trajectory(order_size: float, adv: float, volatility: float,
                        risk_aversion: float, steps: int = 100) -> np.ndarray:
    """
    Almgren-Chriss optimal liquidation trajectory.
    Returns array of remaining shares at each time step.
    """
    eta = 0.1 * adv          # temporary impact coefficient (scaled)
    gamma = 0.05 * adv       # permanent impact coefficient (scaled)
    sigma = volatility
    lam = max(risk_aversion, 1e-6)

    kappa_sq = lam * sigma ** 2 / eta
    kappa = np.sqrt(kappa_sq)

    t = np.linspace(0, 1, steps + 1)
    trajectory = order_size * np.sinh(kappa * (1 - t)) / np.sinh(kappa)
    return trajectory
