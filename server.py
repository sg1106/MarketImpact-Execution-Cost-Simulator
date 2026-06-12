"""
Flask backend for the Market Impact Simulator.
Frontend (HTML/CSS/JS) calls /api/simulate; all math runs in Python.
"""
import numpy as np
from flask import Flask, jsonify, request, send_from_directory

from metrics import (
    expected_slippage,
    execution_cost,
    implementation_shortfall,
    risk_adjusted_cost,
    cost_decomposition,
    model_comparison,
    market_impact_bps,
    participation_sensitivity,
    size_sensitivity,
)
from execution_simulator import simulate_execution

app = Flask(__name__, static_folder=".", static_url_path="")


# ── Static frontend ────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


# ── API ────────────────────────────────────────────────────────────────────

@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.get_json(force=True)

    order_size         = float(data.get("orderSize", 100_000))
    adv                = float(data.get("adv", 1_000_000))
    participation_rate = float(data.get("participationRate", 10)) / 100.0
    volatility         = float(data.get("volatility", 2.0)) / 100.0
    risk_aversion      = float(data.get("riskAversion", 2))
    strategy           = data.get("strategy", "AC")
    n_paths            = int(data.get("nPaths", 200))
    sim_steps          = int(data.get("simSteps", 100))
    surface_res        = int(data.get("surfaceRes", 30))

    benchmark_price = 100.0

    # ── Core metrics ──────────────────────────────────────────────────────
    slippage       = expected_slippage(order_size, adv, participation_rate, volatility)
    cost           = execution_cost(order_size, adv, participation_rate, volatility)
    executed_price = benchmark_price + slippage
    shortfall      = implementation_shortfall(
        order_size, adv, participation_rate, volatility, benchmark_price, executed_price
    )
    risk_cost = risk_adjusted_cost(cost, risk_aversion, volatility, order_size, adv)
    bps       = market_impact_bps(order_size, adv, participation_rate, volatility)
    decomp    = cost_decomposition(order_size, adv, participation_rate, volatility, risk_aversion)
    models    = model_comparison(order_size, adv, participation_rate, volatility)

    # ── Sensitivity curves ────────────────────────────────────────────────
    rates, slips_rate = participation_sensitivity(order_size, adv, volatility)
    sizes, slips_size = size_sensitivity(adv, participation_rate, volatility)

    # ── 3D surface / heatmap data ─────────────────────────────────────────
    order_sizes_grid = np.linspace(0.01 * adv, 0.5 * adv, surface_res)
    part_rates_grid  = np.linspace(0.01, 1.0, surface_res)
    slippage_matrix = np.array([
        [expected_slippage(os, adv, pr, volatility) for os in order_sizes_grid]
        for pr in part_rates_grid
    ])

    # ── Execution simulation (Monte Carlo) ────────────────────────────────
    sim = simulate_execution(
        order_size, adv, participation_rate, volatility,
        risk_aversion, steps=sim_steps, n_paths=n_paths, strategy=strategy,
    )

    pnl = sim["pnl_distribution"]

    response = {
        "metrics": {
            "slippage": slippage,
            "cost": cost,
            "shortfall": shortfall,
            "riskCost": risk_cost,
            "bps": bps,
        },
        "decomposition": decomp,
        "models": models,
        "sensitivity": {
            "rates": rates.tolist(),
            "slipsRate": slips_rate.tolist(),
            "sizes": sizes.tolist(),
            "slipsSize": slips_size.tolist(),
        },
        "surface": {
            "orderSizes": order_sizes_grid.tolist(),
            "participationRates": part_rates_grid.tolist(),
            "slippageMatrix": slippage_matrix.tolist(),
        },
        "simulation": {
            "prices": sim["prices"].tolist(),
            "impactedMean": sim["impacted_mean"].tolist(),
            "impactedBand": sim["impacted_band"].tolist(),
            "schedule": sim["schedule"].tolist(),
            "pnlDistribution": pnl.tolist(),
            "strategy": sim["strategy"],
            "steps": sim["steps"],
        },
    }

    return jsonify(response)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
