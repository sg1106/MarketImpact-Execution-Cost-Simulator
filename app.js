/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS  (mirrors visualization.py)
   ═══════════════════════════════════════════════════════════════════ */
   const BG      = "#0a0c10";
   const PANEL   = "#0f1318";
   const GRID    = "#1a2030";
   const AMBER   = "#f5a623";
   const CYAN    = "#00d4ff";
   const GREEN   = "#00e676";
   const RED     = "#ff5252";
   const PURPLE  = "#b388ff";
   const TEXT    = "#c8d8e8";
   const SUBTEXT = "#607080";
   
   const LAYOUT_BASE = {
     template: "plotly_dark",
     paper_bgcolor: BG,
     plot_bgcolor: PANEL,
     font: { family: "'JetBrains Mono', 'Fira Code', monospace", color: TEXT, size: 11 },
     margin: { l: 10, r: 10, t: 40, b: 10 },
   };
   
   function axisStyle(title, extra) {
     return Object.assign({
       title: title || "",
       gridcolor: GRID,
       zerolinecolor: GRID,
       tickfont: { color: SUBTEXT, size: 10 },
       title_font: { color: TEXT, size: 11 },
     }, extra || {});
   }
   
   const PLOT_CONFIG = { responsive: true, displaylogo: false };
   
   /* ═══════════════════════════════════════════════════════════════════
      HELPERS
      ═══════════════════════════════════════════════════════════════════ */
   
   function percentile(sortedArr, p) {
     const idx = (p / 100) * (sortedArr.length - 1);
     const lo = Math.floor(idx);
     const hi = Math.ceil(idx);
     if (lo === hi) return sortedArr[lo];
     const frac = idx - lo;
     return sortedArr[lo] * (1 - frac) + sortedArr[hi] * frac;
   }
   
   function formatNumber(val, decimals = 0) {
     return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
   }
   
   /* ═══════════════════════════════════════════════════════════════════
      VISUALIZATION  (mirrors visualization.py)
      ═══════════════════════════════════════════════════════════════════ */
   
   function plot3DSurface(orderSizes, participationRates, slippageMatrix) {
     const data = [{
       type: "surface",
       z: slippageMatrix,
       x: orderSizes.map(v => v / 1e6),
       y: participationRates.map(v => v * 100),
       colorscale: [
         [0.0,  "#0a0c10"],
         [0.25, "#002244"],
         [0.5,  "#0066cc"],
         [0.75, "#00d4ff"],
         [1.0,  "#f5a623"],
       ],
       opacity: 0.92,
       contours: {
         z: { show: true, usecolormap: true, highlightcolor: AMBER, project: { z: true } },
       },
       lighting: { ambient: 0.6, diffuse: 0.8, specular: 0.4, roughness: 0.6 },
     }];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Slippage Surface  ·  √ Model", font: { color: AMBER, size: 13 } },
       scene: {
         xaxis: { title: "Order Size (M)", gridcolor: GRID, backgroundcolor: BG, tickfont: { color: SUBTEXT } },
         yaxis: { title: "Participation %", gridcolor: GRID, backgroundcolor: BG, tickfont: { color: SUBTEXT } },
         zaxis: { title: "Slippage", gridcolor: GRID, backgroundcolor: BG, tickfont: { color: SUBTEXT } },
         bgcolor: BG,
         camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } },
       },
       height: 520,
     });
   
     Plotly.newPlot("chartSurface", data, layout, PLOT_CONFIG);
   }
   
   function plotCostBreakdown(costs) {
     const labels = Object.keys(costs);
     const values = labels.map(k => Math.abs(costs[k]));
     const colors = [AMBER, CYAN, PURPLE, GREEN];
   
     const data = [{
       type: "pie",
       labels,
       values,
       hole: 0.55,
       marker: { colors: colors.slice(0, labels.length), line: { color: BG, width: 2 } },
       textfont: { color: TEXT, size: 11 },
       hovertemplate: "<b>%{label}</b><br>%{value:,.4f}<br>%{percent}<extra></extra>",
     }];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Cost Decomposition", font: { color: AMBER, size: 13 } },
       showlegend: true,
       legend: { bgcolor: "rgba(0,0,0,0)", font: { color: TEXT, size: 10 } },
       height: 320,
       annotations: [{
         text: "COST<br>MIX", x: 0.5, y: 0.5, showarrow: false,
         font: { size: 12, color: AMBER, family: "JetBrains Mono, monospace" },
       }],
     });
   
     Plotly.newPlot("chartCostBreakdown", data, layout, PLOT_CONFIG);
   }
   
   function plotPriceAnimation(sim) {
     const { prices, impactedMean, impactedBand, schedule, strategy, steps } = sim;
     const t = Array.from({ length: steps + 1 }, (_, i) => i);
   
     const bandLo = impactedBand.map(b => b[0]);
     const bandHi = impactedBand.map(b => b[1]);
   
     const traceBand = {
       x: t.concat([...t].reverse()),
       y: bandHi.concat([...bandLo].reverse()),
       fill: "toself",
       fillcolor: "rgba(0,212,255,0.07)",
       line: { color: "rgba(0,0,0,0)" },
       name: "5–95% band",
       showlegend: true,
       hoverinfo: "skip",
       xaxis: "x", yaxis: "y",
       type: "scatter",
     };
   
     const traceBaseline = {
       x: t, y: prices,
       mode: "lines",
       line: { color: TEXT, width: 1.5, dash: "dot" },
       name: "Baseline (no impact)",
       xaxis: "x", yaxis: "y",
       type: "scatter",
     };
   
     const traceImpacted = {
       x: t, y: impactedMean,
       mode: "lines",
       line: { color: AMBER, width: 2.5 },
       name: `${strategy} impacted (mean)`,
       xaxis: "x", yaxis: "y",
       type: "scatter",
     };
   
     const traceInventory = {
       x: t, y: schedule,
       mode: "lines",
       line: { color: CYAN, width: 1.5 },
       fill: "tozeroy",
       fillcolor: "rgba(0,212,255,0.08)",
       name: "Remaining inventory",
       xaxis: "x2", yaxis: "y2",
       type: "scatter",
     };
   
     const data = [traceBand, traceBaseline, traceImpacted, traceInventory];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: `Price Path Simulation  ·  ${strategy}`, font: { color: AMBER, size: 13 } },
       legend: { bgcolor: "rgba(0,0,0,0)", font: { color: TEXT, size: 10 } },
       height: 520,
       grid: { rows: 2, columns: 1, pattern: "independent", roworder: "top to bottom" },
       xaxis:  Object.assign(axisStyle(""), { domain: [0, 1], anchor: "y", matches: "x2" }),
       xaxis2: Object.assign(axisStyle("Time Step"), { domain: [0, 1], anchor: "y2" }),
       yaxis:  Object.assign(axisStyle("Price"), { domain: [0.34, 1] }),
       yaxis2: Object.assign(axisStyle("Shares"), { domain: [0, 0.28] }),
     });
   
     Plotly.newPlot("chartPricePath", data, layout, PLOT_CONFIG);
   }
   
   function plotHeatmap(data2d, x, y, zlabel = "Slippage") {
     const data = [{
       type: "heatmap",
       z: data2d,
       x: x.map(v => v / 1e6),
       y: y.map(v => v * 100),
       colorscale: [
         [0.0,  "#0a0c10"],
         [0.3,  "#003366"],
         [0.6,  "#0088cc"],
         [0.85, "#00d4ff"],
         [1.0,  "#f5a623"],
       ],
       hoverongaps: false,
       hovertemplate: "Size: %{x:.2f}M<br>Part: %{y:.1f}%<br>Slip: %{z:.5f}<extra></extra>",
       colorbar: {
         title: { text: zlabel, font: { color: TEXT } },
         tickfont: { color: SUBTEXT },
         bgcolor: BG,
       },
     }];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Impact Intensity Heatmap", font: { color: AMBER, size: 13 } },
       xaxis: axisStyle("Order Size (M shares)"),
       yaxis: axisStyle("Participation Rate (%)"),
       height: 420,
     });
   
     Plotly.newPlot("chartHeatmap", data, layout, PLOT_CONFIG);
   }
   
   function plotModelComparison(modelDict) {
     const names = Object.keys(modelDict);
     const values = names.map(k => modelDict[k]);
     const colors = [AMBER, CYAN, GREEN, PURPLE, RED];
   
     const data = [{
       type: "bar",
       x: names,
       y: values,
       marker: { color: colors.slice(0, names.length), line: { color: BG, width: 1.5 } },
       text: values.map(v => v.toFixed(5)),
       textposition: "outside",
       textfont: { color: TEXT, size: 10 },
       hovertemplate: "<b>%{x}</b><br>Slippage: %{y:.6f}<extra></extra>",
     }];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Model Comparison  ·  Slippage Estimates", font: { color: AMBER, size: 13 } },
       xaxis: axisStyle(""),
       yaxis: axisStyle("Slippage"),
       height: 340,
     });
   
     Plotly.newPlot("chartModelComparison", data, layout, PLOT_CONFIG);
   }
   
   function plotSensitivity(rates, slipsRate, sizes, slipsSize) {
     const traceRate = {
       x: rates.map(r => r * 100),
       y: slipsRate,
       mode: "lines",
       line: { color: CYAN, width: 2.5 },
       fill: "tozeroy",
       fillcolor: "rgba(0,212,255,0.06)",
       name: "Participation",
       xaxis: "x", yaxis: "y",
       type: "scatter",
     };
   
     const traceSize = {
       x: sizes.map(s => s / 1e6),
       y: slipsSize,
       mode: "lines",
       line: { color: AMBER, width: 2.5 },
       fill: "tozeroy",
       fillcolor: "rgba(245,166,35,0.06)",
       name: "Order Size",
       xaxis: "x2", yaxis: "y2",
       type: "scatter",
     };
   
     const data = [traceRate, traceSize];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Sensitivity Analysis", font: { color: AMBER, size: 13 } },
       showlegend: false,
       height: 340,
       grid: { rows: 1, columns: 2, pattern: "independent" },
       xaxis:  Object.assign(axisStyle("Participation Rate (%)"), { domain: [0, 0.46] }),
       xaxis2: Object.assign(axisStyle("Order Size (M shares)"), { domain: [0.54, 1] }),
       yaxis:  Object.assign(axisStyle("Slippage"), { domain: [0, 1] }),
       yaxis2: Object.assign(axisStyle("Slippage"), { domain: [0, 1], anchor: "x2" }),
       annotations: [
         { text: "Slippage vs Participation Rate", x: 0.23, y: 1.12, xref: "paper", yref: "paper",
           showarrow: false, font: { color: TEXT, size: 11 } },
         { text: "Slippage vs Order Size", x: 0.77, y: 1.12, xref: "paper", yref: "paper",
           showarrow: false, font: { color: TEXT, size: 11 } },
       ],
     });
   
     Plotly.newPlot("chartSensitivity", data, layout, PLOT_CONFIG);
   }
   
   function plotPnLDistribution(pnl) {
     const meanVal = pnl.reduce((a, b) => a + b, 0) / pnl.length;
     const sorted = [...pnl].sort((a, b) => a - b);
     const p5 = percentile(sorted, 5);
   
     const data = [{
       type: "histogram",
       x: pnl,
       nbinsx: 50,
       marker: { color: CYAN, opacity: 0.7, line: { color: BG, width: 0.5 } },
       name: "IS Distribution",
     }];
   
     const layout = Object.assign({}, LAYOUT_BASE, {
       title: { text: "Implementation Shortfall Distribution (Monte Carlo)", font: { color: AMBER, size: 13 } },
       xaxis: axisStyle("Implementation Shortfall ($)"),
       yaxis: axisStyle("Frequency"),
       height: 320,
       bargap: 0.05,
       shapes: [
         { type: "line", x0: meanVal, x1: meanVal, y0: 0, y1: 1, yref: "paper",
           line: { color: AMBER, dash: "dash", width: 2 } },
         { type: "line", x0: p5, x1: p5, y0: 0, y1: 1, yref: "paper",
           line: { color: RED, dash: "dot", width: 1.5 } },
       ],
       annotations: [
         { text: `Mean ${meanVal.toLocaleString(undefined, {maximumFractionDigits:0})}`,
           x: meanVal, y: 1, yref: "paper", yshift: 10, showarrow: false, font: { color: AMBER, size: 10 } },
         { text: `5th pct ${p5.toLocaleString(undefined, {maximumFractionDigits:0})}`,
           x: p5, y: 0.92, yref: "paper", yshift: 10, showarrow: false, font: { color: RED, size: 10 } },
       ],
     });
   
     Plotly.newPlot("chartPnL", data, layout, PLOT_CONFIG);
   }
   
   /* ═══════════════════════════════════════════════════════════════════
      MAIN APP LOGIC — calls Python backend via /api/simulate
      ═══════════════════════════════════════════════════════════════════ */
   
   function getInputs() {
     return {
       orderSize: parseFloat(document.getElementById("orderSize").value) || 1,
       adv: parseFloat(document.getElementById("adv").value) || 1,
       participationRate: parseFloat(document.getElementById("participation").value),
       volatility: parseFloat(document.getElementById("volatility").value),
       riskAversion: parseFloat(document.getElementById("riskAversion").value),
       strategy: document.getElementById("strategy").value,
       nPaths: parseInt(document.getElementById("nPaths").value),
       simSteps: parseInt(document.getElementById("simSteps").value),
       surfaceRes: parseInt(document.getElementById("surfaceRes").value),
     };
   }
   
   async function runSimulation() {
     const inp = getInputs();
   
     let result;
     try {
       const res = await fetch("/api/simulate", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(inp),
       });
       if (!res.ok) throw new Error(`Server error: ${res.status}`);
       result = await res.json();
     } catch (err) {
       console.error("Simulation request failed:", err);
       alert("Simulation failed: " + err.message + "\n\nIs the Flask server running?");
       return;
     }
   
     const { metrics, decomposition, models, sensitivity, surface, simulation } = result;
   
     // ── KPI bar ───────────────────────────────────────────────────────
     document.getElementById("kpiSlippage").textContent = metrics.slippage.toFixed(5);
     document.getElementById("kpiCost").textContent = formatNumber(metrics.cost, 0);
     document.getElementById("kpiShortfall").textContent = formatNumber(metrics.shortfall, 0);
     document.getElementById("kpiRiskCost").textContent = formatNumber(metrics.riskCost, 0);
     document.getElementById("kpiBps").textContent = metrics.bps.toFixed(1);
   
     // ── Tab 1: 3D surface, cost breakdown, heatmap ───────────────────
     plot3DSurface(surface.orderSizes, surface.participationRates, surface.slippageMatrix);
     plotCostBreakdown(decomposition);
     plotHeatmap(surface.slippageMatrix, surface.orderSizes, surface.participationRates);
   
     // ── Tab 2: Price path ─────────────────────────────────────────────
     plotPriceAnimation(simulation);
     document.getElementById("kpiStrategy").textContent = simulation.strategy;
     const pnl = simulation.pnlDistribution;
     const meanIS = pnl.reduce((a, b) => a + b, 0) / pnl.length;
     const sortedPnl = [...pnl].sort((a, b) => a - b);
     const p5IS = percentile(sortedPnl, 5);
     document.getElementById("kpiMeanIS").textContent = formatNumber(meanIS, 0);
     document.getElementById("kpiP5IS").textContent = formatNumber(p5IS, 0);
   
     // ── Tab 3: Model comparison ───────────────────────────────────────
     plotModelComparison(models);
     const modelEstimatesEl = document.getElementById("modelEstimates");
     modelEstimatesEl.innerHTML = "";
     Object.entries(models).forEach(([name, val]) => {
       const card = document.createElement("div");
       card.className = "kpi-card";
       card.innerHTML = `<div class="kpi-label">${name}</div><div class="kpi-value">${val.toFixed(6)}</div>`;
       modelEstimatesEl.appendChild(card);
     });
   
     // ── Tab 4: Sensitivity & PnL ──────────────────────────────────────
     plotSensitivity(sensitivity.rates, sensitivity.slipsRate, sensitivity.sizes, sensitivity.slipsSize);
     plotPnLDistribution(pnl);
   }
   
   /* ═══════════════════════════════════════════════════════════════════
      UI WIRING
      ═══════════════════════════════════════════════════════════════════ */
   
   // Tabs
   document.querySelectorAll(".tab").forEach(tab => {
     tab.addEventListener("click", () => {
       document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
       document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
       tab.classList.add("active");
       document.getElementById(tab.dataset.tab).classList.add("active");
       window.dispatchEvent(new Event("resize"));
     });
   });
   
   // Slider value displays (live, no API call)
   const sliderPairs = [
     ["participation", "participationVal", v => `${v}%`],
     ["riskAversion", "riskAversionVal", v => `${v}`],
     ["nPaths", "nPathsVal", v => `${v}`],
     ["simSteps", "simStepsVal", v => `${v}`],
     ["surfaceRes", "surfaceResVal", v => `${v}`],
   ];
   
   sliderPairs.forEach(([inputId, labelId, fmt]) => {
     const input = document.getElementById(inputId);
     const label = document.getElementById(labelId);
     input.addEventListener("input", () => {
       label.textContent = fmt(input.value);
     });
   });
   
   // Submit button — only this triggers recomputation
   const submitBtn = document.getElementById("submitBtn");
   const loadingMsg = document.getElementById("loadingMsg");
   
   submitBtn.addEventListener("click", async () => {
     submitBtn.disabled = true;
     submitBtn.textContent = "⏳ RUNNING…";
     loadingMsg.style.display = "block";
     try {
       await runSimulation();
     } finally {
       submitBtn.disabled = false;
       submitBtn.textContent = "▶ RUN SIMULATION";
       loadingMsg.style.display = "none";
     }
   });
   
   // Allow Enter key inside any sidebar field to trigger submit
   document.querySelectorAll(".sidebar input, .sidebar select").forEach(el => {
     el.addEventListener("keydown", (e) => {
       if (e.key === "Enter") {
         e.preventDefault();
         submitBtn.click();
       }
     });
   });
   
   // Initial run on page load
   submitBtn.click();