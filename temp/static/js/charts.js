/**
 * FinanceFamille — Gestion des graphiques Chart.js
 * Fabriqué par: Technologies Nexios TF Inc. | nexiostf.com
 */

// Palette de couleurs cohérente avec les deux thèmes
const COLORS = {
  blue:   "#2563EB",
  violet: "#7C3AED",
  green:  "#10B981",
  red:    "#EF4444",
  amber:  "#F59E0B",
  cyan:   "#06B6D4",
  pink:   "#EC4899",
  muted:  "#8FA3BC",
};

function isLightTheme() {
  return document.documentElement.getAttribute("data-theme") === "light";
}

function getChartDefaults() {
  const light = isLightTheme();
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: light ? "#111827" : "#F0F5FF", font: { size: 12 }, padding: 16 }
      },
      tooltip: {
        backgroundColor: light ? "#ffffff" : "#141F35",
        titleColor:      light ? "#111827" : "#F0F5FF",
        bodyColor:       light ? "#6b7280" : "#8FA3BC",
        borderColor: "rgba(99,102,241,0.3)",
        borderWidth: 1,
      }
    }
  };
}

function chartBorderColor() {
  return isLightTheme() ? "#ffffff" : "#141F35";
}

function chartGridColor() {
  return isLightTheme() ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.08)";
}

function chartTickColor() {
  return isLightTheme() ? "#6b7280" : COLORS.muted;
}

// Instances des graphiques actifs
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

/**
 * Graphique donut — Répartition du budget mensuel.
 * revenu, paiements, depenses, solde: nombres
 */
function renderDonutChart(canvasId, { revenu, paiements, depenses, solde }) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const soldeVal = Math.max(0, solde);

  const cd = getChartDefaults();
  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [t("stats.revenue"), t("stats.fixed"), t("stats.variable"), t("stats.balance")],
      datasets: [{
        data: [
          Math.max(0, paiements),
          Math.max(0, depenses),
          soldeVal,
          // Si déficit, montrer quand même le total comme 100%
          revenu > 0 ? 0 : 1,
        ],
        backgroundColor: [COLORS.blue, COLORS.violet, COLORS.amber, COLORS.green],
        borderWidth: 2,
        borderColor: chartBorderColor(),
      }]
    },
    options: {
      ...cd,
      cutout: "65%",
      plugins: {
        ...cd.plugins,
        tooltip: {
          ...cd.plugins.tooltip,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct = revenu > 0 ? ((val / revenu) * 100).toFixed(1) : 0;
              return ` ${window.currencySymbol || "$"}${val.toFixed(2)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Graphique barres — Évolution mensuelle des dépenses sur 12 mois.
 * data: [{mois: "2025-01", total: 1234.56}, ...]
 */
function renderBarChart(canvasId, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = data.map(d => {
    const [y, m] = d.mois.split("-");
    return new Date(y, parseInt(m) - 1).toLocaleDateString(
      currentLang === "fr" ? "fr-CA" : "en-CA",
      { month: "short", year: "2-digit" }
    );
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: t("stats.variable"),
        data: data.map(d => d.total),
        backgroundColor: "rgba(37,99,235,0.6)",
        borderColor: COLORS.blue,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      ...getChartDefaults(),
      scales: {
        x: { ticks: { color: chartTickColor() }, grid: { color: chartGridColor() } },
        y: {
          ticks: {
            color: chartTickColor(),
            callback: (v) => `${window.currencySymbol || "$"}${v.toFixed(0)}`
          },
          grid: { color: chartGridColor() }
        }
      }
    }
  });
}

/**
 * Graphique linéaire — Progression du remboursement de chaque dette.
 * dettes: [{nom, montant_total_dette, montant_restant_dette, pct_rembourse}, ...]
 */
function renderDebtChart(canvasId, dettes) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (!dettes || dettes.length === 0) {
    ctx.parentElement.style.display = "none";
    return;
  }
  ctx.parentElement.style.display = "";

  const palette = [COLORS.blue, COLORS.green, COLORS.amber, COLORS.violet, COLORS.cyan, COLORS.pink];

  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dettes.map(d => d.nom),
      datasets: [
        {
          label: t("pay.remaining"),
          data: dettes.map(d => d.montant_restant_dette),
          backgroundColor: dettes.map((_, i) => palette[i % palette.length] + "99"),
          borderColor: dettes.map((_, i) => palette[i % palette.length]),
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      ...getChartDefaults(),
      indexAxis: "y",
      scales: {
        x: {
          ticks: {
            color: chartTickColor(),
            callback: (v) => `${window.currencySymbol || "$"}${v.toFixed(0)}`
          },
          grid: { color: chartGridColor() }
        },
        y: { ticks: { color: chartTickColor() }, grid: { display: false } }
      }
    }
  });
}

/**
 * Graphique donut — Répartition des dépenses par catégorie.
 */
function renderCategoryChart(canvasId, data) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (!data || data.length === 0) return;

  const palette = [COLORS.blue, COLORS.violet, COLORS.amber, COLORS.green, COLORS.cyan, COLORS.pink, COLORS.red];

  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map(d => d.categorie),
      datasets: [{
        data: data.map(d => d.total),
        backgroundColor: data.map((_, i) => palette[i % palette.length]),
        borderWidth: 2,
        borderColor: chartBorderColor(),
      }]
    },
    options: {
      ...getChartDefaults(),
      cutout: "60%",
    }
  });
}

// Rafraîchir les graphiques lors d'un changement de langue ou de thème
document.addEventListener("langchange", () => {
  document.dispatchEvent(new CustomEvent("statsrefresh"));
});
document.addEventListener("themechange", () => {
  document.dispatchEvent(new CustomEvent("statsrefresh"));
});
