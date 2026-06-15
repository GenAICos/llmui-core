/**
 * ocr.js — Gestion de l'onglet OCR Factures dans FinanceFamille.
 * Dépendances : window.csrfToken (injecté par base.html), showToast() (main.js)
 */

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function ocrShowDropzone() {
  document.getElementById("ocr-dropzone").style.display  = "";
  document.getElementById("ocr-result-panel").style.display = "none";
  document.getElementById("ocr-loading").style.display   = "none";
}

function ocrShowLoading() {
  document.getElementById("ocr-dropzone").style.display  = "none";
  document.getElementById("ocr-result-panel").style.display = "none";
  document.getElementById("ocr-loading").style.display   = "";
}

function ocrShowResult(data, filename) {
  document.getElementById("ocr-dropzone").style.display  = "none";
  document.getElementById("ocr-loading").style.display   = "none";
  document.getElementById("ocr-result-panel").style.display = "";

  document.getElementById("ocr-facture-id").value = data.id;
  document.getElementById("ocr-nom").value        = data.marchand || "";
  document.getElementById("ocr-montant").value    = data.montant != null ? data.montant : "";
  document.getElementById("ocr-date").value       = data.date   || new Date().toISOString().slice(0, 10);
  document.getElementById("ocr-categorie").value  = data.categorie || "Autre";
  document.getElementById("ocr-result-filename").textContent = filename || "";
}

/* ── Upload handlers ─────────────────────────────────────────────────────── */

function openOcrUpload() {
  document.getElementById("ocr-file-input").click();
}

function ocrHandleDrop(event) {
  event.preventDefault();
  document.getElementById("ocr-dropzone").classList.remove("drag-over");
  const file = event.dataTransfer.files[0];
  if (file) ocrHandleFile(file);
}

async function ocrHandleFile(file) {
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    showToast && showToast("Format non supporté. Utilisez JPG, PNG, WebP ou PDF.", "error");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast && showToast("Fichier trop volumineux (max 10 Mo).", "error");
    return;
  }

  ocrShowLoading();

  const formData = new FormData();
  formData.append("file", file);

  try {
    const resp = await fetch("/api/ocr/analyser", {
      method: "POST",
      headers: { "X-CSRF-Token": window.csrfToken || "" },
      body: formData,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Erreur inconnue." }));
      showToast && showToast(err.detail || "Erreur OCR.", "error");
      ocrShowDropzone();
      return;
    }

    const data = await resp.json();
    ocrShowResult(data, file.name);
    ocrLoadHistory(); // Rafraîchir l'historique pour afficher l'item "En attente"
  } catch (e) {
    showToast && showToast("Erreur réseau lors de l'analyse.", "error");
    ocrShowDropzone();
  }
}

/* ── Confirmation ────────────────────────────────────────────────────────── */

async function ocrConfirmer() {
  const factureId  = parseInt(document.getElementById("ocr-facture-id").value, 10);
  const nom        = document.getElementById("ocr-nom").value.trim();
  const montant    = parseFloat(document.getElementById("ocr-montant").value);
  const date       = document.getElementById("ocr-date").value;
  const categorie  = document.getElementById("ocr-categorie").value.trim() || "Autre";

  if (!nom)               { showToast && showToast("Le libellé est requis.", "error"); return; }
  if (!montant || montant <= 0) { showToast && showToast("Le montant doit être positif.", "error"); return; }
  if (!date)              { showToast && showToast("La date est requise.", "error"); return; }

  const btn = document.querySelector(".ocr-result-actions .btn-primary");
  if (btn) { btn.disabled = true; btn.textContent = "Enregistrement…"; }

  try {
    const resp = await fetch("/api/ocr/confirmer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": window.csrfToken || "",
      },
      body: JSON.stringify({ facture_id: factureId, nom, montant, date_depense: date, categorie }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Erreur." }));
      showToast && showToast(err.detail || "Erreur lors de l'enregistrement.", "error");
    } else {
      showToast && showToast("Dépense enregistrée avec succès !", "success");
      ocrReset();
      ocrLoadHistory();
      // Rafraîchir le résumé du dashboard si disponible
      if (typeof loadBudgetState === "function") loadBudgetState();
      if (typeof loadDepenses    === "function") loadDepenses();
    }
  } catch (e) {
    showToast && showToast("Erreur réseau.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✅ Enregistrer comme dépense"; }
  }
}

function ocrReset() {
  document.getElementById("ocr-file-input").value = "";
  ocrShowDropzone();
}

/* ── Historique ──────────────────────────────────────────────────────────── */

async function ocrLoadHistory() {
  const container = document.getElementById("ocr-history-list");
  if (!container) return;

  try {
    const resp = await fetch("/api/ocr/historique");
    if (!resp.ok) return;
    const { items } = await resp.json();

    if (!items || items.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucune facture scannée.</p>';
      return;
    }

    const fmt = (v) => v != null
      ? new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(v)
      : "—";

    const rows = items.map((f) => {
      const safeId  = parseInt(f.id, 10);
      const safeMt  = f.montant != null ? Number(f.montant) : "";
      const safeDt  = f.date_facture ? String(f.date_facture).slice(0, 10) : "";
      const safeCat = escHtml(f.categorie || "Autre");
      const safeMar = escHtml(f.marchand || "");
      return `
      <div class="ocr-history-item ${f.confirme ? "confirmed" : ""}">
        <div class="ocr-history-meta">
          <span class="ocr-history-name">${escHtml(f.marchand || f.nom_fichier)}</span>
          <span class="ocr-history-cat text-muted">${safeCat}</span>
        </div>
        <div class="ocr-history-right">
          <span class="ocr-history-amount">${fmt(f.montant)}</span>
          <span class="badge ${f.confirme ? "badge-green" : "badge-amber"}">
            ${f.confirme ? "✅ Enregistrée" : "⏳ En attente"}
          </span>
          ${!f.confirme ? `
            <button class="btn btn-primary btn-xs"
              onclick="ocrReconfirmer(${safeId},'${safeMar}',${safeMt || "null"},'${safeDt}','${safeCat}')">
              ✏️ Compléter
            </button>
            <button class="btn btn-ghost btn-xs" onclick="ocrDeleteItem(${safeId})">🗑</button>
          ` : ""}
        </div>
      </div>`;
    }).join("");

    container.innerHTML = rows;
  } catch (e) {
    // Silencieux
  }
}

/**
 * Rouvre le formulaire de confirmation pour une facture "En attente"
 * (utile quand l'OCR n'a pas extrait les données et que l'utilisateur avait annulé).
 */
function ocrReconfirmer(id, marchand, montant, dateFacture, categorie) {
  ocrShowResult(
    { id, marchand, montant, date: dateFacture || "", categorie: categorie || "Autre", description: "" },
    marchand || ("Facture #" + id)
  );
  document.getElementById("ocr-result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function ocrDeleteItem(id) {
  if (!confirm("Supprimer cette entrée de l'historique ?")) return;
  const resp = await fetch(`/api/ocr/${id}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": window.csrfToken || "" },
  });
  if (resp.ok || resp.status === 204) {
    showToast && showToast("Supprimé.", "success");
    ocrLoadHistory();
  }
}

function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ── Init ────────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  // Charger l'historique quand l'onglet Factures devient actif
  document.addEventListener("tabChange", (e) => {
    if (e.detail === "factures") ocrLoadHistory();
  });
  // Si l'onglet est déjà actif au chargement (peu probable mais défensif)
  const activeTab = document.querySelector(".tab-btn.active");
  if (activeTab && activeTab.dataset.tab === "factures") ocrLoadHistory();
});
