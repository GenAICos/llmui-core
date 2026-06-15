// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// LLMUI Entreprise v4.3 — /zadmin Messages de login

'use strict';

registerTab('greetings', (container) => loadGreetings(container));

// ── Helpers ────────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _gAlert(msg, type = 'error') {
  const el = document.getElementById('greet-alert');
  if (el) el.innerHTML = `<div class="alert alert-${type}">${_esc(msg)}</div>`;
}

function _gClearAlert() {
  const el = document.getElementById('greet-alert');
  if (el) el.innerHTML = '';
}

// ── Templates rapides ──────────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  { label: '🎄 Noël', text: '🎄 Joyeux Noël ! Que cette période soit magique pour vous.' },
  { label: '💝 St-Valentin', text: '💝 Bonne Saint-Valentin ! Andy vous souhaite une journée remplie d\'amour.' },
  { label: '🎆 Nouvel An', text: '🎆 Bonne Année ! Bienvenue dans cette nouvelle année pleine de possibilités.' },
  { label: '🎃 Halloween', text: '🎃 Joyeux Halloween ! Méfiez-vous des fantômes dans le pipeline…' },
  { label: '🐣 Pâques', text: '🐣 Joyeuses Pâques ! Bonne chasse aux œufs.' },
  { label: '🔧 Maintenance', text: '⚠️ Le système est en maintenance. Merci de votre patience.' },
];

// ── Rendu principal ────────────────────────────────────────────────────────────

async function loadGreetings(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Messages de bienvenue au login</h2>
    </div>
    <div id="greet-alert"></div>

    <!-- ── Message global (broadcast) ── -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <h3 style="margin:0;font-size:1rem;">Message global</h3>
          <p style="margin:0.25rem 0 0;font-size:0.8rem;color:var(--color-text-muted);">
            Affiché à TOUS les utilisateurs au login. Un message personnalisé a priorité sur le message global.
          </p>
        </div>
        <span id="broadcast-status-badge" class="badge badge-secondary">Inactif</span>
      </div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:0.75rem;">
          <label for="broadcast-msg">Message</label>
          <textarea id="broadcast-msg" class="form-control" rows="2"
            placeholder="Ex: 🎄 Joyeux Noël à toute l'équipe !" style="resize:vertical;"></textarea>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.9rem;" id="broadcast-templates">
          ${QUICK_TEMPLATES.map((t, i) => `
            <button class="btn btn-secondary btn-sm" onclick="_applyTemplate(${i})">${_esc(t.label)}</button>
          `).join('')}
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="saveBroadcast()">Enregistrer le message global</button>
          <button class="btn btn-danger btn-sm" onclick="clearBroadcast()">Désactiver</button>
        </div>
      </div>
    </div>

    <!-- ── Messages personnalisés ── -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <h3 style="margin:0;font-size:1rem;">Messages personnalisés</h3>
          <p style="margin:0.25rem 0 0;font-size:0.8rem;color:var(--color-text-muted);">
            Message spécifique par adresse e-mail. Remplace le message global pour l'utilisateur ciblé.
          </p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openGreetModal()">+ Ajouter</button>
      </div>
      <div class="card-body" style="padding:0;">
        <div id="greet-list"><div class="spinner" style="margin:2rem auto;"></div></div>
      </div>
    </div>

    <!-- ── Modal ajout/édition ── -->
    <div class="modal-overlay" id="greet-modal" style="display:none;">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h3 id="greet-modal-title">Nouveau message personnalisé</h3>
          <button class="modal-close" onclick="closeGreetModal()">×</button>
        </div>
        <div class="modal-body">
          <div id="greet-modal-alert"></div>
          <div class="form-group">
            <label for="greet-email">Adresse e-mail *</label>
            <input type="email" id="greet-email" class="form-control" required
              placeholder="utilisateur@domaine.com" />
          </div>
          <div class="form-group">
            <label for="greet-msg">Message *</label>
            <textarea id="greet-msg" class="form-control" rows="3" required
              placeholder="Bonjour [Prénom] !"
              style="resize:vertical;"></textarea>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:-0.25rem;">
            ${QUICK_TEMPLATES.map((t, i) => `
              <button type="button" class="btn btn-secondary btn-sm"
                onclick="_applyTemplateToModal(${i})">${_esc(t.label)}</button>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGreetModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveGreetModal()">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  await refreshGreetings();
}

// ── Templates rapides ──────────────────────────────────────────────────────────

function _applyTemplate(idx) {
  const inp = document.getElementById('broadcast-msg');
  if (inp) inp.value = QUICK_TEMPLATES[idx]?.text || '';
}

function _applyTemplateToModal(idx) {
  const inp = document.getElementById('greet-msg');
  if (inp) inp.value = QUICK_TEMPLATES[idx]?.text || '';
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

async function _loadBroadcast() {
  try {
    const data = await Api.get('/admin/greetings/broadcast');
    const inp = document.getElementById('broadcast-msg');
    const badge = document.getElementById('broadcast-status-badge');
    if (inp) inp.value = data.message || '';
    if (badge) {
      badge.textContent = data.active ? 'Actif' : 'Inactif';
      badge.className = 'badge ' + (data.active ? 'badge-success' : 'badge-secondary');
    }
  } catch (e) {
    _gAlert('Erreur lors du chargement du message global : ' + e.message);
  }
}

async function saveBroadcast() {
  _gClearAlert();
  const msg = (document.getElementById('broadcast-msg')?.value || '').trim();
  try {
    await Api.put('/admin/greetings/broadcast', { message: msg });
    showToast(msg ? 'Message global enregistré.' : 'Message global désactivé.', 'success');
    await _loadBroadcast();
  } catch (e) {
    _gAlert('Erreur : ' + e.message);
  }
}

async function clearBroadcast() {
  _gClearAlert();
  try {
    await Api.delete('/admin/greetings/broadcast');
    document.getElementById('broadcast-msg').value = '';
    showToast('Message global désactivé.', 'success');
    await _loadBroadcast();
  } catch (e) {
    _gAlert('Erreur : ' + e.message);
  }
}

// ── Liste des messages personnalisés ─────────────────────────────────────────

async function refreshGreetings() {
  await Promise.all([_loadBroadcast(), _loadGreetList()]);
}

async function _loadGreetList() {
  const list = document.getElementById('greet-list');
  if (!list) return;
  try {
    const data = await Api.get('/admin/greetings/');
    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = `<p style="padding:1.25rem;color:var(--color-text-muted);font-size:0.85rem;">
        Aucun message personnalisé. Cliquez sur <strong>+ Ajouter</strong> pour en créer un.
      </p>`;
      return;
    }
    list.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Message</th>
            <th style="width:80px;">Statut</th>
            <th style="width:120px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(g => `
            <tr>
              <td style="font-family:monospace;font-size:0.85rem;">${_esc(g.email)}</td>
              <td style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                title="${_esc(g.message)}">${_esc(g.message || '—')}</td>
              <td>
                <span class="badge ${g.active ? 'badge-success' : 'badge-secondary'}">
                  ${g.active ? 'Actif' : 'Vide'}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:0.3rem;">
                  <button class="btn btn-secondary btn-sm" title="Modifier"
                    onclick="editGreet('${_esc(g.email)}', '${_esc(g.message)}')">✏️</button>
                  <button class="btn btn-danger btn-sm" title="Supprimer"
                    onclick="deleteGreet('${_esc(g.email)}')">🗑</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    list.innerHTML = `<p style="padding:1.25rem;color:var(--color-danger);">
      Erreur : ${_esc(e.message)}
    </p>`;
  }
}

// ── Modal personnalisé ────────────────────────────────────────────────────────

let _editingEmail = null;

function openGreetModal(email = '', message = '') {
  _editingEmail = email || null;
  const emailInp = document.getElementById('greet-email');
  const msgInp   = document.getElementById('greet-msg');
  const title    = document.getElementById('greet-modal-title');
  const alert    = document.getElementById('greet-modal-alert');

  if (emailInp) { emailInp.value = email; emailInp.disabled = !!email; }
  if (msgInp)   msgInp.value = message;
  if (title)    title.textContent = email ? `Modifier — ${email}` : 'Nouveau message personnalisé';
  if (alert)    alert.innerHTML = '';

  document.getElementById('greet-modal').style.display = 'flex';
  (document.getElementById(email ? 'greet-msg' : 'greet-email'))?.focus();
}

function editGreet(email, message) {
  openGreetModal(email, message);
}

function closeGreetModal() {
  document.getElementById('greet-modal').style.display = 'none';
  _editingEmail = null;
}

async function saveGreetModal() {
  const alertEl = document.getElementById('greet-modal-alert');
  const email   = (document.getElementById('greet-email')?.value || '').trim().toLowerCase();
  const msg     = (document.getElementById('greet-msg')?.value   || '').trim();

  if (!email) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-error">L\'adresse e-mail est requise.</div>';
    return;
  }
  if (!msg) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-error">Le message ne peut pas être vide.</div>';
    return;
  }

  try {
    await Api.put(`/admin/greetings/${encodeURIComponent(email)}`, { message: msg });
    showToast('Message enregistré.', 'success');
    closeGreetModal();
    await _loadGreetList();
  } catch (e) {
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-error">Erreur : ${_esc(e.message)}</div>`;
  }
}

async function deleteGreet(email) {
  if (!confirm(`Supprimer le message de bienvenue pour ${email} ?`)) return;
  _gClearAlert();
  try {
    await Api.delete(`/admin/greetings/${encodeURIComponent(email)}`);
    showToast('Message supprimé.', 'success');
    await _loadGreetList();
  } catch (e) {
    _gAlert('Erreur lors de la suppression : ' + e.message);
  }
}
