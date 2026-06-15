// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet OLLAMA HOST

registerTab('ollama', (container) => loadOllama(container));

// ── Auto-refresh toutes les 15 minutes ────────────────────────────────────────

const OLLAMA_AUTO_REFRESH_MS = 15 * 60 * 1000;
let _ollamaRefreshTimer   = null;
let _ollamaCountdownTimer = null;
let _ollamaNextRefreshAt  = null;

function _startOllamaAutoRefresh() {
  _stopOllamaAutoRefresh();
  _ollamaNextRefreshAt = Date.now() + OLLAMA_AUTO_REFRESH_MS;

  _ollamaRefreshTimer = setTimeout(() => {
    const container = document.getElementById('tab-ollama');
    if (container) loadOllama(container);
  }, OLLAMA_AUTO_REFRESH_MS);

  _ollamaCountdownTimer = setInterval(_updateOllamaCountdown, 1000);
  _updateOllamaCountdown();
}

function _stopOllamaAutoRefresh() {
  if (_ollamaRefreshTimer)   { clearTimeout(_ollamaRefreshTimer);   _ollamaRefreshTimer = null; }
  if (_ollamaCountdownTimer) { clearInterval(_ollamaCountdownTimer); _ollamaCountdownTimer = null; }
}

function _updateOllamaCountdown() {
  const el = document.getElementById('ollama-auto-refresh-countdown');
  if (!el) return;
  const remaining = Math.max(0, Math.round((_ollamaNextRefreshAt - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  el.textContent = `Actualisation auto dans ${m}:${String(s).padStart(2, '0')}`;
}

async function loadOllama(container) {
  _stopOllamaAutoRefresh();
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';
  try {
    const hosts = await Api.get('/admin/ollama/hosts/');
    container.innerHTML = `
      <div class="toolbar" style="align-items:center">
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-primary" onclick="showAddOllamaModal()">+ Ajouter un host</button>
          <button class="btn btn-secondary" onclick="loadOllama(document.getElementById('tab-ollama'))">Actualiser</button>
        </div>
        <span id="ollama-auto-refresh-countdown" style="font-size:0.75rem;color:var(--color-text-muted);margin-left:auto"></span>
      </div>
      ${hosts.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🖥️</div><h3>Aucun host Ollama</h3></div>' : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
          ${hosts.map(h => `
            <div class="card">
              <div class="card-header">
                <div>
                  <span class="status-dot ${h.last_ping_success === true ? 'online' : h.last_ping_success === false ? 'offline' : 'unknown'}"></span>
                  <strong>${h.name}</strong>
                  ${h.is_default ? '<span class="badge badge-success" style="margin-left:0.5rem">Défaut</span>' : ''}
                </div>
                <div style="display:flex;gap:0.25rem">
                  <button class="btn btn-secondary btn-sm" onclick="pingHost(${h.id})">Ping</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteHost(${h.id}, '${h.name}')">✕</button>
                </div>
              </div>
              <p style="font-size:0.875rem;color:var(--color-text-secondary)">${h.url}:${h.port}</p>
              ${h.available_models ? `<p style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.5rem">${h.available_models.length} modèle(s) : ${h.available_models.slice(0,3).join(', ')}${h.available_models.length > 3 ? '...' : ''}</p>` : ''}
              ${h.last_ping_at ? `<p style="font-size:0.75rem;color:var(--color-text-muted)">Dernier test: ${new Date(h.last_ping_at).toLocaleString('fr-CA')}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;
    _startOllamaAutoRefresh();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function showAddOllamaModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Ajouter un host Ollama</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="add-ollama-alert"></div>
      <form id="add-ollama-form">
        <div class="form-group"><label>Nom *</label><input name="name" required placeholder="LLMUI01"></div>
        <div class="form-group"><label>URL *</label><input name="url" required placeholder="http://192.168.1.100"></div>
        <div class="form-group"><label>Port</label><input name="port" type="number" value="11434"></div>
        <div class="form-group"><label>Description</label><input name="description"></div>
        <div style="margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="is_cloud" value="true" style="width:auto">
            <span>Instance cloud (permet jusqu'à 1 million de tokens)</span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Ajouter</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#add-ollama-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post('/admin/ollama/hosts/', {
        name: fd.get('name'), url: fd.get('url'),
        port: parseInt(fd.get('port')), description: fd.get('description'),
        is_cloud: fd.get('is_cloud') === 'true',
      });
      modal.remove();
      showToast('Host ajouté', 'success');
      loadOllama(document.getElementById('tab-ollama'));
    } catch (err) {
      showAlert('add-ollama-alert', err.message);
    }
  });
}

async function pingHost(id) {
  showToast('Test en cours...', 'info', 2000);
  try {
    const result = await Api.post(`/admin/ollama/hosts/${id}/ping`);
    if (result.success) {
      showToast(`En ligne — ${result.latency_ms}ms — ${result.models_count} modèle(s)`, 'success');
    } else {
      showToast(`Hors ligne: ${result.error}`, 'error');
    }
    loadOllama(document.getElementById('tab-ollama'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteHost(id, name) {
  if (!confirm(`Supprimer le host "${name}" ?`)) return;
  try {
    await Api.delete(`/admin/ollama/hosts/${id}`);
    showToast('Host supprimé', 'success');
    loadOllama(document.getElementById('tab-ollama'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}
