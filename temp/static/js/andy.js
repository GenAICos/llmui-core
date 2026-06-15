/**
 * andy.js — Widget de chat Andy avec encadrement légal.
 *
 * Flux d'utilisation :
 *  1. Premier lancement → affiche la bannière de disclaimer (acceptation requise).
 *  2. L'utilisateur accepte → préférence sauvegardée côté serveur + localStorage.
 *  3. Andy répond normalement, chaque échange est loggé côté serveur (audit).
 *  4. L'utilisateur peut désactiver Andy via ⚙️ → confirmation → désactivé.
 *  5. En état désactivé, le widget affiche un message et un bouton de réactivation.
 */

/* ── État ────────────────────────────────────────────────────────────────── */

let _andyOpen        = false;
let _andySending     = false;
let _andyPrefs       = null;   // { andy_disabled, andy_disclaimer_ok }

/* ── Init préférences ───────────────────────────────────────────────────── */

async function andyLoadPrefs() {
  try {
    const r = await fetch("/api/andy/preferences");
    if (r.ok) _andyPrefs = await r.json();
  } catch (_) {
    _andyPrefs = { andy_disabled: false, andy_disclaimer_ok: false };
  }
}

/* ── Toggle panneau ─────────────────────────────────────────────────────── */

async function andyToggle() {
  if (!_andyPrefs) await andyLoadPrefs();

  _andyOpen = !_andyOpen;
  const panel = document.getElementById("andy-panel");
  const fab   = document.getElementById("andy-fab");
  if (!panel || !fab) return;

  if (_andyOpen) {
    panel.style.display = "flex";
    fab.innerHTML = "✕";

    if (_andyPrefs?.andy_disabled) {
      _andyShowDisabled();
    } else if (!_andyPrefs?.andy_disclaimer_ok) {
      _andyShowDisclaimer();
    } else {
      _andyShowChat();
    }
  } else {
    panel.style.display = "none";
    fab.innerHTML = '<img src="/static/img/andyHead.png" alt="Andy" style="width:2.25rem;height:2.25rem;object-fit:cover;border-radius:50%">';
  }
}

/* ── Vues ────────────────────────────────────────────────────────────────── */

function _andyShowDisclaimer() {
  const body = document.getElementById("andy-body");
  if (!body) return;
  body.innerHTML = `
    <div class="andy-disclaimer">
      <div class="andy-disclaimer-icon">⚖️</div>
      <h4>Avant de commencer</h4>
      <p>
        <strong>Andy n'est pas un planificateur financier certifié.</strong><br>
        Ses réponses sont à titre <em>informatif et éducatif uniquement</em>.
        Elles ne constituent pas des conseils financiers, fiscaux ou juridiques professionnels.
      </p>
      <p class="text-muted" style="font-size:0.8rem;margin-top:0.5rem">
        Pour toute décision financière importante, consultez un professionnel qualifié
        (planificateur financier, comptable, notaire).
      </p>
      <div class="andy-disclaimer-actions">
        <button class="btn btn-ghost btn-sm" onclick="andyDisable()">
          Désactiver Andy
        </button>
        <button class="btn btn-primary btn-sm" onclick="andyAcceptDisclaimer()">
          J'ai compris, continuer
        </button>
      </div>
    </div>
  `;
}

function _andyShowDisabled() {
  const body = document.getElementById("andy-body");
  if (!body) return;
  body.innerHTML = `
    <div class="andy-disclaimer">
      <div class="andy-disclaimer-icon">🔕</div>
      <h4>Andy est désactivé</h4>
      <p class="text-muted">
        Vous avez désactivé l'assistant IA Andy. Vous pouvez le réactiver à tout moment.
      </p>
      <div class="andy-disclaimer-actions">
        <button class="btn btn-primary btn-sm" onclick="andyEnable()">
          Réactiver Andy
        </button>
      </div>
    </div>
  `;
}

function _andyShowChat() {
  const body = document.getElementById("andy-body");
  if (!body) return;
  body.innerHTML = `
    <div class="andy-disclaimer-bar">
      ⚖️ Andy n'est pas un planificateur financier certifié.
    </div>
    <div id="andy-messages" aria-live="polite"></div>
    <div id="andy-support-bar" style="display:none;padding:0.4rem 0.75rem;background:rgba(245,158,11,0.08);border-top:1px solid rgba(245,158,11,0.2);text-align:center">
      <span style="font-size:0.78rem;color:var(--text-muted)">Andy n'a pas pu vous aider ?</span>
      <button onclick="andyShowEscaladeForm()" style="background:none;border:1px solid rgba(245,158,11,0.5);color:#F59E0B;padding:0.2rem 0.65rem;border-radius:var(--radius);font-size:0.78rem;cursor:pointer;margin-left:0.5rem">📧 Contacter le support</button>
    </div>
    <div id="andy-escalade-form" style="display:none;padding:0.75rem;border-top:1px solid var(--border);background:var(--bg-card)">
      <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem">Un résumé de votre conversation sera envoyé à notre équipe de support qui prendra le relais.</p>
      <textarea id="andy-escalade-comment" rows="2" maxlength="1000"
                placeholder="Décrivez brièvement votre problème (optionnel)…"
                style="width:100%;resize:vertical;font-size:0.85rem;padding:0.4rem 0.6rem;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-input);color:var(--text-primary)"></textarea>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;justify-content:flex-end">
        <button onclick="andyHideEscaladeForm()" style="background:none;border:1px solid var(--border);color:var(--text-muted);padding:0.3rem 0.75rem;border-radius:var(--radius);font-size:0.82rem;cursor:pointer">Annuler</button>
        <button onclick="andyEnvoyerEscalade()" id="andy-escalade-btn" style="background:#F59E0B;color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:var(--radius);font-size:0.82rem;cursor:pointer;font-weight:600">📧 Envoyer au support</button>
      </div>
    </div>
    <div id="andy-input-area">
      <textarea id="andy-input" placeholder="Posez une question à Andy…"
                rows="1" maxlength="2000"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();andySend()}"
                oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      <button onclick="andySend()" id="andy-send-btn" title="Envoyer">➤</button>
    </div>
  `;

  // Message de bienvenue
  _andyAppendMsg(
    "assistant",
    "Bonjour ! Je suis Andy 👋 Comment puis-je vous aider avec FinanceFamille aujourd'hui ?"
  );

  setTimeout(() => document.getElementById("andy-input")?.focus(), 50);
}

/* ── Escalade support ────────────────────────────────────────────────────── */

let _andyEscaladeShown = false;
let _andyMsgCount = 0;  // compte les réponses reçues

function _andyResponseIndicatesLimit(text) {
  const t = text.toLowerCase();
  return (
    t.includes("je ne peux pas") ||
    t.includes("je ne suis pas en mesure") ||
    t.includes("je n'ai pas accès") ||
    t.includes("consultez un professionnel") ||
    t.includes("contactez le support") ||
    t.includes("je ne sais pas") ||
    t.includes("hors de ma portée") ||
    t.includes("beyond my") ||
    t.includes("cannot help") ||
    t.includes("i don't know")
  );
}

function _andyMaybeShowSupportBar() {
  const bar = document.getElementById("andy-support-bar");
  if (bar && bar.style.display === "none") {
    bar.style.display = "block";
  }
}

function andyShowEscaladeForm() {
  document.getElementById("andy-escalade-form").style.display = "block";
  document.getElementById("andy-escalade-comment")?.focus();
}

function andyHideEscaladeForm() {
  document.getElementById("andy-escalade-form").style.display = "none";
}

async function andyEnvoyerEscalade() {
  const btn     = document.getElementById("andy-escalade-btn");
  const comment = document.getElementById("andy-escalade-comment")?.value?.trim() || "";
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Envoi…"; }

  try {
    const resp = await fetch("/api/andy/escalade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": window.csrfToken || "",
      },
      body: JSON.stringify({ commentaire: comment }),
    });

    if (resp.ok) {
      const { ticket_id } = await resp.json();
      document.getElementById("andy-escalade-form").style.display = "none";
      document.getElementById("andy-support-bar").style.display   = "none";
      _andyAppendMsg("assistant",
        `✅ Ticket **#${ticket_id}** créé avec succès. Notre équipe a reçu le résumé de votre conversation et vous contactera à votre adresse courriel. Merci de votre patience ! 🙏`
      );
    } else {
      if (btn) { btn.disabled = false; btn.textContent = "📧 Envoyer au support"; }
      _andyAppendMsg("assistant", "⚠️ Une erreur est survenue lors de l'envoi. Veuillez réessayer ou écrire directement à support@nexiostf.com.");
    }
  } catch (_) {
    if (btn) { btn.disabled = false; btn.textContent = "📧 Envoyer au support"; }
    _andyAppendMsg("assistant", "⚠️ Impossible d'envoyer le ticket. Vérifiez votre connexion.");
  }
}

/* ── Actions légales ────────────────────────────────────────────────────── */

async function andyAcceptDisclaimer() {
  await _andySavePref({ andy_disclaimer_ok: true });
  _andyPrefs.andy_disclaimer_ok = true;
  _andyShowChat();
}

async function andyDisable() {
  if (!confirm(
    "Désactiver Andy ?\n\nVous ne recevrez plus de réponses de l'assistant IA.\n" +
    "Vous pouvez le réactiver à tout moment depuis le widget."
  )) return;
  await _andySavePref({ andy_disabled: true });
  _andyPrefs.andy_disabled = true;
  _andyShowDisabled();
}

async function andyEnable() {
  await _andySavePref({ andy_disabled: false, andy_disclaimer_ok: false });
  _andyPrefs.andy_disabled      = false;
  _andyPrefs.andy_disclaimer_ok = false;
  _andyShowDisclaimer();
}

async function _andySavePref(updates) {
  try {
    await fetch("/api/andy/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": window.csrfToken || "",
      },
      body: JSON.stringify(updates),
    });
  } catch (_) { /* silencieux */ }
}

/* ── Effacer l'historique ───────────────────────────────────────────────── */

async function andyClearHistory() {
  if (!confirm("Effacer l'historique de conversation avec Andy ?\n\nNote : le journal d'audit interne est conservé pour des raisons légales.")) return;
  await fetch("/api/andy/historique", {
    method: "DELETE",
    headers: { "X-CSRF-Token": window.csrfToken || "" },
  });
  const msgs = document.getElementById("andy-messages");
  if (msgs) msgs.innerHTML = "";
  _andyAppendMsg("assistant", "Historique effacé. Comment puis-je vous aider ?");
}

/* ── Envoyer un message ─────────────────────────────────────────────────── */

async function andySend() {
  if (_andySending) return;
  const input = document.getElementById("andy-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";
  _andyAppendMsg("user", text);
  _andyShowTyping();
  _andySending = true;

  const sendBtn = document.getElementById("andy-send-btn");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const resp = await fetch("/api/andy/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": window.csrfToken || "",
      },
      body: JSON.stringify({ message: text }),
    });

    _andyRemoveTyping();

    if (resp.status === 403) {
      // L'utilisateur a désactivé Andy entre-temps
      _andyPrefs = { andy_disabled: true, andy_disclaimer_ok: false };
      _andyShowDisabled();
    } else if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Erreur." }));
      _andyAppendMsg("assistant",
        "⚠️ " + (err.detail || "Une erreur est survenue. Réessayez dans un moment.")
      );
      _andyMaybeShowSupportBar();
    } else {
      const { response } = await resp.json();
      _andyAppendMsg("assistant", response);
      // Afficher la barre de support si Andy exprime une limite
      if (_andyResponseIndicatesLimit(response)) {
        _andyMaybeShowSupportBar();
      }
    }
  } catch (e) {
    _andyRemoveTyping();
    _andyAppendMsg("assistant", "⚠️ Impossible de joindre Andy en ce moment. Vérifiez la connexion.");
  } finally {
    _andySending = false;
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}

/* ── Helpers DOM ─────────────────────────────────────────────────────────── */

function _andyAppendMsg(role, text) {
  const msgs = document.getElementById("andy-messages");
  if (!msgs) return;

  const div = document.createElement("div");
  div.className = `andy-msg andy-msg--${role}`;
  div.innerHTML = _andyMarkdown(text);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function _andyShowTyping() {
  const msgs = document.getElementById("andy-messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "andy-msg andy-msg--assistant andy-typing";
  div.id = "andy-typing-indicator";
  div.innerHTML = "<span></span><span></span><span></span>";
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function _andyRemoveTyping() {
  document.getElementById("andy-typing-indicator")?.remove();
}

function _andyMarkdown(text) {
  // 1. Échappement HTML
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Inline : gras et italique
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // 3. Traiter ligne par ligne
  const lines = s.split("\n");
  const out = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^[\s]*[•\-\*]\s+(.+)$/) || line.match(/^[\s]*\d+[.)]\s+(.+)$/);

    if (listMatch) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim() === "") {
        // Ligne vide = séparateur de paragraphe
        out.push('<div style="height:0.5em"></div>');
      } else {
        out.push(`<span>${line}</span><br>`);
      }
    }
  }
  if (inList) out.push("</ul>");

  return out.join("");
}

/* ── Init ────────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  // Pré-charger les préfs au chargement de la page
  andyLoadPrefs();

  // Fermer Andy avec Échap
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _andyOpen) andyToggle();
  });
});
