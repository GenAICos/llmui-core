/**
 * FinanceFamille — Logique principale du dashboard
 * Fabriqué par: Technologies Nexios TF Inc. | nexiostf.com
 */

// ── Utilitaires ────────────────────────────────────────────────────────────

const sym = () => window.currencySymbol || "$";

function fmt(val) {
  return `${sym()}${parseFloat(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtCur(val, itemSym) {
  const s = itemSym || sym();
  return `${s}${parseFloat(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function apiFetch(url, opts = {}) {
  const defaults = { headers: { "Content-Type": "application/json" } };
  const res = await fetch(url, { ...defaults, ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || t("msg.error"));
  }
  if (res.status === 204) return null;
  return res.json();
}

// Token CSRF global (injecté dans base.html)
function getCsrf() { return window.csrfToken || ""; }

// ── Sélecteur de langue (dropdown) ─────────────────────────────────────────

function toggleLangMenu() {
  document.getElementById("lang-menu")?.classList.toggle("open");
}

// Fermer le dropdown si clic en dehors
document.addEventListener("click", e => {
  const dropdown = document.querySelector(".lang-dropdown");
  if (dropdown && !dropdown.contains(e.target)) {
    document.getElementById("lang-menu")?.classList.remove("open");
  }
});

// Fermer après sélection
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".lang-menu .lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("lang-menu")?.classList.remove("open");
    });
  });
});

// ── Avatar utilisateur (dropdown) ──────────────────────────────────────────

function toggleUserMenu() {
  const menu = document.getElementById("user-menu");
  const btn  = document.getElementById("user-avatar-btn");
  if (!menu) return;
  const open = menu.classList.toggle("open");
  btn?.setAttribute("aria-expanded", open ? "true" : "false");
}

document.addEventListener("click", e => {
  if (!e.target.closest("#user-dropdown")) {
    document.getElementById("user-menu")?.classList.remove("open");
    document.getElementById("user-avatar-btn")?.setAttribute("aria-expanded", "false");
  }
});

// ── Thème clair / sombre ────────────────────────────────────────────────────

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("financefamille_theme", next);
  updateThemeBtn(next);
  document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
}

function updateThemeBtn(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

// ── Navigation par onglets ─────────────────────────────────────────────────

function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  function activateTab(tabId) {
    btns.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
    panels.forEach(p => p.classList.toggle("active", p.id === `tab-${tabId}`));
    // Charger les données du panel activé
    switch (tabId) {
      case "revenus":   loadSalaires(); break;
      case "paiements": loadPaiements(); break;
      case "depenses":  loadDepenses(); loadBudgetCategories(); break;
      case "stats":     loadStats("mois"); break;
      case "moyennes":  loadMoyennes(12); break;
      case "factures":  if (typeof ocrLoadHistory === "function") ocrLoadHistory(); break;
      case "famille":   if (typeof loadFamille === "function") loadFamille(); break;
    }
    document.dispatchEvent(new CustomEvent("tabChange", { detail: tabId }));
    window.location.hash = tabId;
  }

  btns.forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Restaurer l'onglet depuis l'URL ou aller sur le premier
  const hash = window.location.hash.replace("#", "");
  const validTabs = ["revenus", "paiements", "depenses", "stats", "moyennes", "factures", "famille", "banque"];
  activateTab(validTabs.includes(hash) ? hash : "revenus");
}

// ── Résumé budget ──────────────────────────────────────────────────────────

async function loadSummary() {
  try {
    const data = await apiFetch("/api/budget/etat");
    document.getElementById("sum-revenue").textContent   = fmt(data.revenu_mensuel);
    document.getElementById("sum-payments").textContent  = fmt(data.paiements_mensuels);
    document.getElementById("sum-expenses").textContent  = fmt(data.depenses_mois);
    const soldeEl = document.getElementById("sum-balance");
    soldeEl.textContent = fmt(data.solde_disponible);
    soldeEl.className = "value " + (data.solde_disponible >= 0 ? "text-green" : "text-red");
  } catch (e) {
    console.error("Erreur chargement résumé:", e);
  }
}

// ── Onglet PAIEMENTS ───────────────────────────────────────────────────────

let paiementsData = [];

async function loadPaiements() {
  try {
    paiementsData = await apiFetch("/api/paiements");
    renderPaiements();
  } catch (e) {
    showToast(t("msg.error"), "error");
  }
}

function renderPaiements() {
  const regular = paiementsData.filter(p => !p.est_dette);
  const dettes  = paiementsData.filter(p => p.est_dette && p.montant_restant_dette > 0);
  const soldees = paiementsData.filter(p => p.est_dette && p.montant_restant_dette <= 0);

  // Tableau paiements réguliers
  const tbody = document.getElementById("pay-tbody");
  if (tbody) {
    tbody.innerHTML = regular.length === 0
      ? `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">${t("msg.no_data")}</td></tr>`
      : regular.map(p => `
        <tr>
          <td>${escHtml(p.nom)}</td>
          <td>${fmtCur(p.montant, p.symbole_devise)}</td>
          <td>${freqLabel(p.frequence)}</td>
          <td style="font-size:0.82rem">${renderMethode(p)}</td>
          <td>${fmtDate(p.date_paiement)}</td>
          <td>${p.rappel_actif
            ? `<span class="badge badge-amber">${p.rappel_jours}j</span>`
            : `<span class="badge badge-blue">—</span>`}</td>
          <td>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditPaiement(${p.id})" title="${t('btn.edit')}">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deletePaiement(${p.id})" title="${t('btn.delete')}">🗑️</button>
          </td>
        </tr>`).join("");
  }

  // Tableau dettes
  const dtbody = document.getElementById("debt-tbody");
  const debtSection = document.getElementById("debt-section");
  if (dtbody) {
    if (dettes.length === 0) {
      debtSection && (debtSection.style.display = "none");
    } else {
      debtSection && (debtSection.style.display = "");
      dtbody.innerHTML = dettes.map(p => {
        const pct = p.montant_total_dette > 0
          ? Math.round((1 - p.montant_restant_dette / p.montant_total_dette) * 100)
          : 0;
        return `
        <tr>
          <td>${escHtml(p.nom)}</td>
          <td>${fmtCur(p.montant, p.symbole_devise)}</td>
          <td>${freqLabel(p.frequence)}</td>
          <td>${fmtDate(p.date_paiement)}</td>
          <td>${fmtCur(p.montant_total_dette, p.symbole_devise)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span class="${p.montant_restant_dette < p.montant_total_dette * 0.2 ? 'text-green' : 'text-amber'}">${fmtCur(p.montant_restant_dette, p.symbole_devise)}</span>
              <div class="progress-bar-wrap" style="min-width:60px">
                <div class="progress-bar-fill ${pct >= 80 ? '' : 'danger'}" style="width:${pct}%"></div>
              </div>
              <span class="text-muted" style="font-size:0.75rem">${pct}%</span>
            </div>
          </td>
          <td>
            <button class="btn btn-success btn-sm" onclick="openPayDebt(${p.id}, '${escHtml(p.nom)}', ${p.montant}, ${p.montant_restant_dette})">
              ${t("btn.pay")}
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditPaiement(${p.id})" title="${t('btn.edit')}">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deletePaiement(${p.id})" title="${t('btn.delete')}">🗑️</button>
          </td>
        </tr>`;
      }).join("");
    }
  }
}

function renderMethode(p) {
  if (!p.methode) return p.paiement_auto ? '<span class="badge badge-blue">Auto</span>' : '<span class="text-muted">Manuel</span>';
  const icons = { bancaire:'🏦', carte_credit:'💳', virement:'↗', cheque:'📄', especes:'💵', autre:'⚙️' };
  const labels = { bancaire:'Bancaire', carte_credit:'Carte', virement:'Virement', cheque:'Chèque', especes:'Espèces', autre:'Autre' };
  const badge = p.paiement_auto ? ' <span class="badge badge-blue" style="font-size:0.7rem">Auto</span>' : '';
  const details = p.methode_details ? ` <span class="text-muted">${escHtml(p.methode_details)}</span>` : '';
  return `${icons[p.methode] || ''}${labels[p.methode] || p.methode}${details}${badge}`;
}

function freqLabel(f) {
  const map = { mensuel: t("pay.freq.mensuel"), bihebdomadaire: t("pay.freq.bihebdo"), hebdomadaire: t("pay.freq.hebdo"), annuel: t("pay.freq.annuel") || "Annuel" };
  return map[f] || f;
}

function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Formulaire Paiement (modal) ────────────────────────────────────────────

function openAddPaiement() {
  document.getElementById("modal-pay-title").textContent = t("btn.add") + " — " + t("nav.paiements");
  document.getElementById("pay-form").reset();
  document.getElementById("pay-id").value = "";
  document.getElementById("debt-fields").style.display = "none";
  document.getElementById("pay-devise").value = sym();
  openModal("modal-paiement");
}

function openEditPaiement(id) {
  const p = paiementsData.find(x => x.id === id);
  if (!p) return;
  document.getElementById("modal-pay-title").textContent = t("btn.edit") + " — " + escHtml(p.nom);
  document.getElementById("pay-id").value               = p.id;
  document.getElementById("pay-nom").value               = p.nom;
  document.getElementById("pay-montant").value           = p.montant;
  document.getElementById("pay-frequence").value         = p.frequence;
  document.getElementById("pay-date").value              = p.date_paiement || "";
  document.getElementById("pay-est-dette").checked       = !!p.est_dette;
  document.getElementById("pay-total-dette").value       = p.montant_total_dette || "";
  document.getElementById("pay-restant").value           = p.montant_restant_dette || "";
  document.getElementById("pay-rappel").checked          = !!p.rappel_actif;
  document.getElementById("pay-rappel-jours").value      = p.rappel_jours || 3;
  document.getElementById("pay-auto").checked            = !!p.paiement_auto;
  document.getElementById("pay-methode").value           = p.methode || "";
  document.getElementById("pay-methode-details").value   = p.methode_details || "";
  document.getElementById("pay-devise").value            = p.symbole_devise || sym();
  document.getElementById("debt-fields").style.display   = p.est_dette ? "" : "none";
  openModal("modal-paiement");
}

document.addEventListener("DOMContentLoaded", () => {
  const estDette = document.getElementById("pay-est-dette");
  if (estDette) {
    estDette.addEventListener("change", () => {
      document.getElementById("debt-fields").style.display = estDette.checked ? "" : "none";
    });
  }
});

async function savePaiement() {
  const id = document.getElementById("pay-id").value;
  const estDette = document.getElementById("pay-est-dette").checked;
  const body = {
    nom:                  document.getElementById("pay-nom").value.trim(),
    montant:              parseFloat(document.getElementById("pay-montant").value),
    frequence:            document.getElementById("pay-frequence").value,
    date_paiement:        document.getElementById("pay-date").value || null,
    est_dette:            estDette,
    montant_total_dette:  estDette ? parseFloat(document.getElementById("pay-total-dette").value || 0) : 0,
    montant_restant_dette:estDette ? parseFloat(document.getElementById("pay-restant").value || 0)  : 0,
    rappel_actif:         document.getElementById("pay-rappel").checked,
    rappel_jours:         parseInt(document.getElementById("pay-rappel-jours").value || 3),
    paiement_auto:        document.getElementById("pay-auto").checked,
    methode:              document.getElementById("pay-methode").value || null,
    methode_details:      document.getElementById("pay-methode-details").value.trim() || null,
    symbole_devise:       document.getElementById("pay-devise").value || sym(),
  };

  try {
    if (id) {
      await apiFetch(`/api/paiements/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await apiFetch("/api/paiements", { method: "POST", body: JSON.stringify(body) });
    }
    closeModal("modal-paiement");
    showToast(t("msg.saved"), "success");
    loadPaiements();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deletePaiement(id) {
  if (!confirm(t("msg.confirm_delete"))) return;
  try {
    await apiFetch(`/api/paiements/${id}`, { method: "DELETE" });
    showToast(t("msg.deleted"), "success");
    loadPaiements();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ── Payer une dette ────────────────────────────────────────────────────────

function openPayDebt(id, nom, montant, restant) {
  document.getElementById("pay-debt-id").value = id;
  document.getElementById("pay-debt-nom").textContent = nom;
  document.getElementById("pay-debt-montant").value = Math.min(montant, restant);
  document.getElementById("pay-debt-date").value = new Date().toISOString().split("T")[0];
  openModal("modal-pay-debt");
}

async function confirmPayDebt() {
  const id = document.getElementById("pay-debt-id").value;
  const body = {
    montant_paye:  parseFloat(document.getElementById("pay-debt-montant").value),
    date_paiement: document.getElementById("pay-debt-date").value || null,
    note:          document.getElementById("pay-debt-note").value || null,
  };
  try {
    const res = await apiFetch(`/api/paiements/${id}/payer`, { method: "POST", body: JSON.stringify(body) });
    closeModal("modal-pay-debt");
    if (res.dette_soldee) showToast(t("msg.debt_cleared"), "success");
    else showToast(t("msg.saved"), "success");
    loadPaiements();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ── Onglet DÉPENSES ────────────────────────────────────────────────────────

let depensesData = [];
let filterMois = new Date().getMonth() + 1;
let filterAnnee = new Date().getFullYear();

async function loadDepenses(mois = filterMois, annee = filterAnnee) {
  filterMois = mois; filterAnnee = annee;
  try {
    const data = await apiFetch(`/api/depenses?mois=${mois}&annee=${annee}`);
    depensesData = data.items;
    renderDepenses(data);
  } catch (e) {
    showToast(t("msg.error"), "error");
  }
}

function renderDepenses(data) {
  const tbody = document.getElementById("exp-tbody");
  const totalEl = document.getElementById("exp-total");
  if (!tbody) return;

  tbody.innerHTML = data.items.length === 0
    ? `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">${t("msg.no_data")}</td></tr>`
    : data.items.map(d => `
      <tr>
        <td>${fmtDate(d.date_depense)}</td>
        <td>${escHtml(d.nom)}</td>
        <td><span class="badge badge-blue">${escHtml(d.categorie || t("exp.no_cat"))}</span></td>
        <td class="text-muted" style="font-size:0.85rem">${escHtml(d.note || "")}</td>
        <td class="text-right"><strong>${fmtCur(d.montant, d.symbole_devise)}</strong></td>
        <td>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditDepense(${d.id})" title="${t('btn.edit')}">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteDepense(${d.id})" title="${t('btn.delete')}">🗑️</button>
        </td>
      </tr>`).join("");

  if (totalEl) totalEl.textContent = fmt(data.total);
}

function openAddDepense() {
  document.getElementById("modal-exp-title").textContent = t("btn.add") + " — " + t("nav.depenses");
  document.getElementById("exp-form").reset();
  document.getElementById("exp-id").value = "";
  document.getElementById("exp-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("exp-devise").value = sym();
  openModal("modal-depense");
}

function openEditDepense(id) {
  const d = depensesData.find(x => x.id === id);
  if (!d) return;
  document.getElementById("modal-exp-title").textContent = t("btn.edit");
  document.getElementById("exp-id").value        = d.id;
  document.getElementById("exp-nom").value        = d.nom;
  document.getElementById("exp-montant").value    = d.montant;
  document.getElementById("exp-date").value       = d.date_depense;
  document.getElementById("exp-categorie").value  = d.categorie || "";
  document.getElementById("exp-note").value       = d.note || "";
  document.getElementById("exp-devise").value     = d.symbole_devise || sym();
  openModal("modal-depense");
}

async function saveDepense() {
  const id = document.getElementById("exp-id").value;
  const body = {
    nom:            document.getElementById("exp-nom").value.trim(),
    montant:        parseFloat(document.getElementById("exp-montant").value),
    date_depense:   document.getElementById("exp-date").value,
    categorie:      document.getElementById("exp-categorie").value.trim() || null,
    note:           document.getElementById("exp-note").value.trim() || null,
    symbole_devise: document.getElementById("exp-devise").value || sym(),
  };
  try {
    if (id) {
      await apiFetch(`/api/depenses/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await apiFetch("/api/depenses", { method: "POST", body: JSON.stringify(body) });
    }
    closeModal("modal-depense");
    showToast(t("msg.saved"), "success");
    loadDepenses();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteDepense(id) {
  if (!confirm(t("msg.confirm_delete"))) return;
  try {
    await apiFetch(`/api/depenses/${id}`, { method: "DELETE" });
    showToast(t("msg.deleted"), "success");
    loadDepenses();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// Naviguer dans les mois
document.addEventListener("DOMContentLoaded", () => {
  const moisSelect = document.getElementById("filter-mois");
  const anneeInput = document.getElementById("filter-annee");
  if (moisSelect) moisSelect.addEventListener("change", () => loadDepenses(parseInt(moisSelect.value), filterAnnee));
  if (anneeInput) anneeInput.addEventListener("change", () => loadDepenses(filterMois, parseInt(anneeInput.value)));
});

// ── Onglet STATISTIQUES ────────────────────────────────────────────────────

let currentPeriode = "mois";

async function loadStats(periode = "mois") {
  currentPeriode = periode;
  // Activer le bon bouton
  document.querySelectorAll(".period-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.period === periode);
  });

  try {
    const data = await apiFetch(`/api/stats/${periode}`);
    renderStats(data);
  } catch (e) {
    showToast(t("msg.error"), "error");
  }
}

function renderStats(data) {
  // Tableau récapitulatif
  const statsEl = {
    "stats-revenue":   data.revenu_mensuel,
    "stats-payments":  data.paiements_mensuels,
    "stats-expenses":  data.depenses_mois,
    "stats-balance":   data.solde_disponible,
    "stats-saved-pct": null,
  };
  Object.entries(statsEl).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "stats-saved-pct") {
      el.textContent = `${data.pct_economise}%`;
      el.className = "value " + (data.pct_economise >= 0 ? "text-green" : "text-red");
    } else {
      el.textContent = fmt(val);
      if (id === "stats-balance") el.className = "value " + (val >= 0 ? "text-green" : "text-red");
    }
  });

  // Graphiques
  renderDonutChart("chart-donut", {
    revenu:     data.revenu_mensuel,
    paiements:  data.paiements_mensuels,
    depenses:   data.depenses_mois,
    solde:      data.solde_disponible,
  });
  renderBarChart("chart-evolution", data.evolution_12m);
  renderDebtChart("chart-dettes", data.dettes);
  renderCategoryChart("chart-categories", data.depenses_par_cat);
}

document.addEventListener("statsrefresh", () => loadStats(currentPeriode));

// ── Onglet MOYENNES ────────────────────────────────────────────────────────

async function loadMoyennes(mois = 12) {
  document.querySelectorAll(".avg-period-btn").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.mois || "0") === mois);
  });

  try {
    const data = await apiFetch(`/api/moyennes?mois=${mois}`);
    renderMoyennes(data);
  } catch (e) {
    showToast(t("msg.error"), "error");
  }
}

function renderMoyennes(data) {
  const tbody = document.getElementById("avg-tbody");
  if (!tbody) return;

  const trendIcon = (t_val) => {
    if (t_val === "hausse") return `<span class="text-red">${t("avg.trend.up")}</span>`;
    if (t_val === "baisse") return `<span class="text-green">${t("avg.trend.down")}</span>`;
    return `<span class="text-muted">${t("avg.trend.stable")}</span>`;
  };

  tbody.innerHTML = data.par_nom.length === 0
    ? `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">${t("msg.no_data")}</td></tr>`
    : data.par_nom.map(r => `
      <tr>
        <td>${escHtml(r.nom)}</td>
        <td><span class="badge badge-blue">${escHtml(r.categorie)}</span></td>
        <td class="text-center">${r.occurrences}</td>
        <td class="text-right"><strong>${fmt(r.moyenne)}</strong></td>
        <td class="text-right text-muted">${fmt(r.minimum)}</td>
        <td class="text-right text-muted">${fmt(r.maximum)}</td>
        <td>${trendIcon(r.tendance)}</td>
      </tr>`).join("");

  // Tableau par catégorie
  const catTbody = document.getElementById("avg-cat-tbody");
  if (catTbody) {
    catTbody.innerHTML = data.par_categorie.map(r => `
      <tr>
        <td>${escHtml(r.categorie)}</td>
        <td class="text-center">${r.occurrences}</td>
        <td class="text-right"><strong>${fmt(r.moyenne)}</strong></td>
        <td class="text-right">${fmt(r.total)}</td>
      </tr>`).join("");
  }
}

// ── Onglet REVENUS (Salaires) ──────────────────────────────────────────────

let salairesData = [];

async function loadSalaires() {
  try {
    salairesData = await apiFetch("/api/salaires");
    renderSalaires();
  } catch (e) {
    showToast(t("msg.error"), "error");
  }
}

function renderSalaires() {
  const tbody = document.getElementById("sal-tbody");
  const totalEl = document.getElementById("sal-total");
  if (!tbody) return;

  tbody.innerHTML = salairesData.length === 0
    ? `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">${t("msg.no_data")}</td></tr>`
    : salairesData.map(s => {
        const monthly = calcMonthly(s.montant_net, s.frequence);
        return `
        <tr>
          <td><strong>${escHtml(s.personne)}</strong></td>
          <td>${fmtCur(s.montant_net, s.symbole_devise)}</td>
          <td>${freqLabel(s.frequence)}</td>
          <td class="text-green">${fmtCur(monthly, s.symbole_devise)}</td>
          <td>${fmtDate(s.date_paiement)}</td>
          <td>${s.actif
            ? `<span class="badge badge-green">✓</span>`
            : `<span class="badge badge-red">✗</span>`}</td>
          <td>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditSalaire(${s.id})" title="${t('btn.edit')}">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteSalaire(${s.id})" title="${t('btn.delete')}">🗑️</button>
          </td>
        </tr>`;
      }).join("");

  // Total mensuel équivalent (actifs seulement)
  if (totalEl) {
    const total = salairesData
      .filter(s => s.actif)
      .reduce((sum, s) => sum + calcMonthly(s.montant_net, s.frequence), 0);
    totalEl.textContent = fmt(total);
  }
}

function calcMonthly(montant, frequence) {
  if (frequence === "hebdomadaire")   return montant * 4.333;
  if (frequence === "bihebdomadaire") return montant * 2.167;
  if (frequence === "annuel")         return montant / 12;
  return montant;
}

function openAddSalaire() {
  document.getElementById("modal-sal-title").textContent = t("btn.add") + " — " + t("nav.revenus");
  document.getElementById("sal-form").reset();
  document.getElementById("sal-id").value = "";
  document.getElementById("sal-actif").checked = true;
  document.getElementById("sal-devise").value = sym();
  openModal("modal-salaire");
}

function openEditSalaire(id) {
  const s = salairesData.find(x => x.id === id);
  if (!s) return;
  document.getElementById("modal-sal-title").textContent = t("btn.edit") + " — " + escHtml(s.personne);
  document.getElementById("sal-id").value        = s.id;
  document.getElementById("sal-personne").value  = s.personne;
  document.getElementById("sal-montant").value   = s.montant_net;
  document.getElementById("sal-frequence").value = s.frequence;
  document.getElementById("sal-date").value      = s.date_paiement || "";
  document.getElementById("sal-actif").checked   = !!s.actif;
  document.getElementById("sal-devise").value    = s.symbole_devise || sym();
  openModal("modal-salaire");
}

async function saveSalaire() {
  const id = document.getElementById("sal-id").value;
  const body = {
    personne:       document.getElementById("sal-personne").value.trim(),
    montant_net:    parseFloat(document.getElementById("sal-montant").value),
    frequence:      document.getElementById("sal-frequence").value,
    date_paiement:  document.getElementById("sal-date").value || null,
    actif:          document.getElementById("sal-actif").checked,
    symbole_devise: document.getElementById("sal-devise").value || sym(),
  };
  try {
    if (id) {
      await apiFetch(`/api/salaires/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await apiFetch("/api/salaires", { method: "POST", body: JSON.stringify(body) });
    }
    closeModal("modal-salaire");
    showToast(t("msg.saved"), "success");
    loadSalaires();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteSalaire(id) {
  if (!confirm(t("msg.confirm_delete"))) return;
  try {
    await apiFetch(`/api/salaires/${id}`, { method: "DELETE" });
    showToast(t("msg.deleted"), "success");
    loadSalaires();
    loadSummary();
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ── Gestion des modals ─────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
  document.body.style.overflow = "";
}

// Fermer un modal en cliquant sur l'overlay
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Touche Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m.id));
    }
  });
});

// ── Initialisation ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Initialiser le bouton de thème
  const savedTheme = document.documentElement.getAttribute("data-theme") || "dark";
  updateThemeBtn(savedTheme);

  initTabs();
  loadSummary();

  // Initialiser le filtre dépenses avec la date actuelle
  const moisSelect = document.getElementById("filter-mois");
  const anneeInput = document.getElementById("filter-annee");
  if (moisSelect) moisSelect.value = new Date().getMonth() + 1;
  if (anneeInput) anneeInput.value = new Date().getFullYear();

  // Boutons de périodes statistiques
  document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => loadStats(btn.dataset.period));
  });

  // Boutons de périodes moyennes
  document.querySelectorAll(".avg-period-btn").forEach(btn => {
    btn.addEventListener("click", () => loadMoyennes(parseInt(btn.dataset.mois || 0)));
  });

  // Rafraîchir le résumé lors d'un changement de langue
  document.addEventListener("langchange", () => {
    loadSummary();
    loadBudgetCategories();
  });
});

// ── Budgets par catégorie ───────────────────────────────────────────────────

async function loadBudgetCategories() {
  const container = document.getElementById("budget-cat-list");
  if (!container) return;

  try {
    const cats = await apiFetch("/api/budget/categories");
    renderBudgetCategories(cats);
  } catch (e) {
    container.innerHTML = `<div class="budget-cat-empty">${t("msg.error")}</div>`;
  }
}

function renderBudgetCategories(cats) {
  const container = document.getElementById("budget-cat-list");
  if (!container) return;

  if (!cats || cats.length === 0) {
    container.innerHTML = `<div class="budget-cat-empty">${t("budget.no_cats")}</div>`;
    return;
  }

  container.innerHTML = cats.map(cat => {
    const pct = cat.budget_mensuel > 0 ? Math.min((cat.depenses_mois / cat.budget_mensuel) * 100, 100) : 0;
    const remaining = cat.budget_mensuel - cat.depenses_mois;
    const fillClass = cat.depasse ? "danger" : "";
    let alertHtml = "";
    if (cat.depasse) {
      alertHtml = `<div class="budget-cat-alert danger">${t("budget.alert_100")}</div>`;
    } else if (cat.alerte) {
      alertHtml = `<div class="budget-cat-alert warning">${t("budget.alert_80")}</div>`;
    }

    return `
    <div class="budget-cat-card ${cat.depasse ? "depasse" : cat.alerte ? "alerte" : ""}">
      <div class="budget-cat-card__header">
        <span class="budget-cat-card__name">${escHtml(cat.categorie)}</span>
        <div class="budget-cat-card__actions">
          <button class="btn btn-ghost btn-sm btn-icon" title="${t("btn.edit")}"
                  onclick="openEditBudgetCat(${cat.id}, '${escHtml(cat.categorie)}', ${cat.budget_mensuel})">✎</button>
          <button class="btn btn-danger btn-sm btn-icon" title="${t("btn.delete")}"
                  onclick="deleteBudgetCat(${cat.id})">✕</button>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill ${fillClass}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="budget-cat-card__amounts">
        <span>${t("budget.spent")} : <strong>${fmt(cat.depenses_mois)}</strong></span>
        <span>${fmt(cat.budget_mensuel)}</span>
      </div>
      <div class="budget-cat-card__amounts" style="margin-top:0">
        <span>${t("budget.remaining")} : <strong class="${remaining < 0 ? "text-red" : "text-green"}">${fmt(remaining)}</strong></span>
        <span class="text-muted">${pct.toFixed(0)}%</span>
      </div>
      ${alertHtml}
    </div>`;
  }).join("");
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function openAddBudgetCat() {
  document.getElementById("budget-cat-id").value = "";
  document.getElementById("budget-cat-nom").value = "";
  document.getElementById("budget-cat-montant").value = "";
  openModal("modal-budget-cat");
}

function openEditBudgetCat(id, nom, montant) {
  document.getElementById("budget-cat-id").value = id;
  document.getElementById("budget-cat-nom").value = nom;
  document.getElementById("budget-cat-montant").value = montant;
  openModal("modal-budget-cat");
}

async function saveBudgetCat() {
  const nom     = document.getElementById("budget-cat-nom").value.trim();
  const montant = parseFloat(document.getElementById("budget-cat-montant").value);
  if (!nom || isNaN(montant) || montant <= 0) return;

  try {
    await apiFetch("/api/budget/categories", {
      method: "POST",
      body: JSON.stringify({ categorie: nom, budget_mensuel: montant }),
      headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() }
    });
    closeModal("modal-budget-cat");
    showToast(t("msg.saved"), "success");
    loadBudgetCategories();
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function deleteBudgetCat(id) {
  if (!confirm(t("msg.confirm_delete"))) return;
  try {
    await apiFetch(`/api/budget/categories/${id}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": getCsrf() }
    });
    showToast(t("msg.deleted"), "success");
    loadBudgetCategories();
  } catch (e) {
    showToast(e.message, "error");
  }
}
