// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// LLMUI Entreprise v4.3 — /zadmin Proxmox LLM Test tab

'use strict';

registerTab('proxmox', (container) => loadProxmox(container));

let _proxmoxNodes   = [];
let _proxmoxServers = [];
let _editingServerId = null;

async function loadProxmox(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Proxmox LLM Test</h2>
      <p class="text-muted">Gérez vos serveurs Proxmox SSH et testez vos modèles Ollama sur l'infrastructure.</p>
    </div>
    <div id="proxmox-alert"></div>

    <!-- ── Serveurs SSH (PVE2) ───────────────────────────────────────────── -->
    <div class="card mb-4">
      <div class="card-header">
        <h3>Serveurs Proxmox SSH</h3>
        <button class="btn btn-primary btn-sm" onclick="openProxmoxServerModal()">+ Ajouter</button>
      </div>
      <div class="card-body" id="proxmox-servers-list">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- ── Nœuds PVE (API) ────────────────────────────────────────────────── -->
    <div class="proxmox-layout">
      <div class="card proxmox-config-card">
        <div class="card-header">
          <h3>Nœuds Proxmox (API PVE)</h3>
          <button class="btn btn-secondary btn-sm" onclick="refreshProxmoxNodes()">↻ Rafraîchir</button>
        </div>
        <div class="card-body" id="proxmox-nodes-list">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- ── Formulaire de test ───────────────────────────────────────────── -->
      <div class="card proxmox-test-card">
        <div class="card-header">
          <h3>Lancer un test LLM</h3>
        </div>
        <div class="card-body">
          <div id="proxmox-test-alert"></div>
          <form id="proxmox-test-form" onsubmit="runProxmoxTest(event)">
            <div class="form-group">
              <label for="prx-server">Serveur SSH</label>
              <select id="prx-server" class="form-control">
                <option value="">Chargement...</option>
              </select>
            </div>
            <div class="form-group">
              <label for="prx-node">Nœud (info)</label>
              <select id="prx-node" class="form-control">
                <option value="">Sélectionner un nœud (optionnel)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="prx-model">Modèle Ollama</label>
              <input type="text" id="prx-model" class="form-control"
                     placeholder="ex: llama3.2:3b, qwen2.5:0.5b" required>
            </div>
            <div class="form-group">
              <label for="prx-prompt">Prompt de test</label>
              <textarea id="prx-prompt" class="form-control" rows="4"
                        placeholder="Entrez votre prompt..." required>Réponds en 3 mots : Quelle est la capitale de la France ?</textarea>
            </div>
            <div class="form-group">
              <label for="prx-iterations">Itérations</label>
              <input type="number" id="prx-iterations" class="form-control" value="1" min="1" max="10">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="prx-run-btn">▶ Lancer le test</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ── Historique ───────────────────────────────────────────────────────── -->
    <div class="card mt-4">
      <div class="card-header">
        <h3>Historique des tests</h3>
      </div>
      <div class="card-body" id="proxmox-jobs-list">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- ── Modal résultat ──────────────────────────────────────────────────── -->
    <div class="modal-overlay" id="proxmox-result-modal" style="display:none">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Résultat du test</h3>
          <button class="modal-close" onclick="closeProxmoxModal()">×</button>
        </div>
        <div class="modal-body" id="proxmox-result-body"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeProxmoxModal()">Fermer</button>
        </div>
      </div>
    </div>

    <!-- ── Modal serveur SSH ──────────────────────────────────────────────── -->
    <div class="modal-overlay" id="proxmox-server-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h3 id="proxmox-server-modal-title">Nouveau serveur Proxmox</h3>
          <button class="modal-close" onclick="closeProxmoxServerModal()">×</button>
        </div>
        <div class="modal-body">
          <div id="proxmox-server-modal-alert"></div>
          <form id="proxmox-server-form" onsubmit="saveProxmoxServer(event)">
            <div class="form-group">
              <label for="prx-srv-name">Nom *</label>
              <input type="text" id="prx-srv-name" class="form-control" required placeholder="ex: pve-prod">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="prx-srv-ip">Adresse IP *</label>
                <input type="text" id="prx-srv-ip" class="form-control" required placeholder="10.0.3.10">
              </div>
              <div class="form-group">
                <label for="prx-srv-port">Port SSH</label>
                <input type="number" id="prx-srv-port" class="form-control" value="22" min="1" max="65535">
              </div>
            </div>
            <div class="form-group">
              <label for="prx-srv-user">Utilisateur SSH</label>
              <input type="text" id="prx-srv-user" class="form-control" value="root">
            </div>
            <div class="form-group">
              <label for="prx-srv-key">Clé SSH privée <span class="badge badge-warning">Chiffrée AES-256</span></label>
              <textarea id="prx-srv-key" class="form-control" rows="5"
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."></textarea>
              <small class="text-muted" id="prx-srv-key-hint"></small>
            </div>
            <div class="form-group">
              <label for="prx-srv-desc">Description</label>
              <input type="text" id="prx-srv-desc" class="form-control" placeholder="Optionnel">
            </div>
            <div class="form-row">
              <div class="form-group form-group-toggle">
                <label>Actif</label>
                <label class="toggle">
                  <input type="checkbox" id="prx-srv-active" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="form-group form-group-toggle">
                <label>Production</label>
                <label class="toggle">
                  <input type="checkbox" id="prx-srv-prod">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeProxmoxServerModal()">Annuler</button>
          <button class="btn btn-primary" onclick="document.getElementById('proxmox-server-form').requestSubmit()" id="prx-srv-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- ── Modal confirm delete ──────────────────────────────────────────── -->
    <div class="modal-overlay" id="proxmox-delete-modal" style="display:none">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Supprimer le serveur</h3>
          <button class="modal-close" onclick="closeProxmoxDeleteModal()">×</button>
        </div>
        <div class="modal-body">
          <p>Supprimer <strong id="proxmox-delete-name"></strong> ?</p>
          <p class="text-muted">Cette action est irréversible.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeProxmoxDeleteModal()">Annuler</button>
          <button class="btn btn-danger" onclick="confirmDeleteProxmoxServer()" id="proxmox-confirm-delete-btn">Supprimer</button>
        </div>
      </div>
    </div>
  `;

  await Promise.all([
    refreshProxmoxServers(),
    refreshProxmoxNodes(),
    refreshProxmoxJobs(),
  ]);
}


// ── Serveurs SSH ──────────────────────────────────────────────────────────────

async function refreshProxmoxServers() {
  const listEl = document.getElementById('proxmox-servers-list');
  if (!listEl) return;

  try {
    const data = await Api.get('/admin/proxmox/servers');
    _proxmoxServers = Array.isArray(data) ? data : [];
    renderProxmoxServers();
    populateServerSelect();
  } catch (err) {
    listEl.innerHTML = `<div class="alert alert-error">Erreur: ${err.message}</div>`;
  }
}

function renderProxmoxServers() {
  const listEl = document.getElementById('proxmox-servers-list');
  if (!listEl) return;

  if (_proxmoxServers.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🖥️</div>
        <h3>Aucun serveur configuré</h3>
        <p>Ajoutez un serveur Proxmox avec accès SSH pour tester les LLMs directement sur votre infrastructure.</p>
        <button class="btn btn-primary" onclick="openProxmoxServerModal()">+ Ajouter un serveur</button>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>IP</th>
          <th>SSH</th>
          <th>Clé</th>
          <th>Type</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${_proxmoxServers.map(s => `
          <tr>
            <td><strong>${escHtml(s.name)}</strong></td>
            <td><code>${escHtml(s.ip_address)}</code></td>
            <td>${escHtml(s.ssh_user)}:${s.ssh_port}</td>
            <td><span class="badge badge-${s.has_ssh_key ? 'success' : 'warning'}">${s.has_ssh_key ? 'OK' : 'Manquante'}</span></td>
            <td><span class="badge badge-${s.is_production ? 'error' : 'secondary'}">${s.is_production ? 'Production' : 'Test'}</span></td>
            <td><span class="badge badge-${s.is_active ? 'success' : 'secondary'}">${s.is_active ? 'Actif' : 'Inactif'}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="openProxmoxServerModal(${s.id})" title="Modifier">✎</button>
              <button class="btn btn-danger btn-sm" onclick="promptDeleteProxmoxServer(${s.id})" title="Supprimer">🗑</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function populateServerSelect() {
  const sel = document.getElementById('prx-server');
  if (!sel) return;
  const active = _proxmoxServers.filter(s => s.is_active);
  if (active.length === 0) {
    sel.innerHTML = '<option value="">Aucun serveur actif</option>';
  } else {
    sel.innerHTML = '<option value="">Sélectionner un serveur</option>' +
      active.map(s => `<option value="${s.id}">${escHtml(s.name)} (${escHtml(s.ip_address)})</option>`).join('');
  }
}

function openProxmoxServerModal(serverId = null) {
  _editingServerId = serverId;
  const title = document.getElementById('proxmox-server-modal-title');
  const hint = document.getElementById('prx-srv-key-hint');

  document.getElementById('proxmox-server-form').reset();
  clearAlert('proxmox-server-modal-alert');

  if (serverId) {
    const s = _proxmoxServers.find(x => x.id === serverId);
    if (!s) return;
    title.textContent = 'Modifier le serveur';
    document.getElementById('prx-srv-name').value = s.name || '';
    document.getElementById('prx-srv-ip').value = s.ip_address || '';
    document.getElementById('prx-srv-port').value = s.ssh_port || 22;
    document.getElementById('prx-srv-user').value = s.ssh_user || 'root';
    document.getElementById('prx-srv-desc').value = s.description || '';
    document.getElementById('prx-srv-active').checked = s.is_active !== false;
    document.getElementById('prx-srv-prod').checked = !!s.is_production;
    hint.textContent = s.has_ssh_key ? 'Clé existante — laissez vide pour la conserver.' : '';
  } else {
    title.textContent = 'Nouveau serveur Proxmox';
    hint.textContent = '';
    document.getElementById('prx-srv-active').checked = true;
  }

  document.getElementById('proxmox-server-modal').style.display = 'flex';
}

function closeProxmoxServerModal() {
  document.getElementById('proxmox-server-modal').style.display = 'none';
  _editingServerId = null;
}

async function saveProxmoxServer(event) {
  event.preventDefault();
  clearAlert('proxmox-server-modal-alert');

  const key = document.getElementById('prx-srv-key').value.trim();
  const payload = {
    name: document.getElementById('prx-srv-name').value.trim(),
    ip_address: document.getElementById('prx-srv-ip').value.trim(),
    ssh_port: parseInt(document.getElementById('prx-srv-port').value, 10) || 22,
    ssh_user: document.getElementById('prx-srv-user').value.trim() || 'root',
    description: document.getElementById('prx-srv-desc').value.trim() || null,
    is_active: document.getElementById('prx-srv-active').checked,
    is_production: document.getElementById('prx-srv-prod').checked,
  };
  if (key) payload.ssh_key = key;
  if (!_editingServerId && !key) {
    showAlert('proxmox-server-modal-alert', 'La clé SSH est obligatoire pour un nouveau serveur.', 'error');
    return;
  }

  const btn = document.getElementById('prx-srv-save-btn');
  setLoading(btn, true);

  try {
    if (_editingServerId) {
      await Api.put(`/admin/proxmox/servers/${_editingServerId}`, payload);
      showToast('Serveur mis à jour.', 'success');
    } else {
      await Api.post('/admin/proxmox/servers', payload);
      showToast('Serveur créé.', 'success');
    }
    closeProxmoxServerModal();
    await refreshProxmoxServers();
  } catch (err) {
    showAlert('proxmox-server-modal-alert', 'Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

let _deleteServerId = null;

function promptDeleteProxmoxServer(serverId) {
  _deleteServerId = serverId;
  const s = _proxmoxServers.find(x => x.id === serverId);
  document.getElementById('proxmox-delete-name').textContent = s ? s.name : serverId;
  document.getElementById('proxmox-delete-modal').style.display = 'flex';
}

function closeProxmoxDeleteModal() {
  document.getElementById('proxmox-delete-modal').style.display = 'none';
  _deleteServerId = null;
}

async function confirmDeleteProxmoxServer() {
  if (!_deleteServerId) return;
  const btn = document.getElementById('proxmox-confirm-delete-btn');
  setLoading(btn, true);
  try {
    await Api.delete(`/admin/proxmox/servers/${_deleteServerId}`);
    showToast('Serveur supprimé.', 'success');
    closeProxmoxDeleteModal();
    await refreshProxmoxServers();
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}


// ── Nœuds PVE (API) ───────────────────────────────────────────────────────────

async function refreshProxmoxNodes() {
  const listEl = document.getElementById('proxmox-nodes-list');
  const selectEl = document.getElementById('prx-node');
  if (!listEl) return;

  try {
    const data = await Api.get('/admin/proxmox/nodes');
    _proxmoxNodes = Array.isArray(data) ? data : (data.nodes || []);

    if (_proxmoxNodes.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>Aucun nœud disponible.</p>
          <p class="text-muted">Configurez l'URL et le token PVE dans <strong>Paramètres → Proxmox</strong>.</p>
        </div>`;
      if (selectEl) selectEl.innerHTML = '<option value="">Aucun nœud disponible</option>';
      return;
    }

    listEl.innerHTML = `
      <div class="proxmox-nodes-grid">
        ${_proxmoxNodes.map(node => `
          <div class="proxmox-node-card ${node.status === 'online' ? 'node-online' : 'node-offline'}">
            <div class="node-icon">🖥️</div>
            <div class="node-info">
              <strong>${escHtml(node.node || node.name || '?')}</strong>
              <span class="badge badge-${node.status === 'online' ? 'success' : 'error'}">${escHtml(node.status || '?')}</span>
              ${node.cpu !== undefined ? `<small>CPU: ${Math.round(node.cpu * 100)}%</small>` : ''}
              ${node.mem && node.maxmem ? `<small>RAM: ${Math.round(node.mem / node.maxmem * 100)}%</small>` : ''}
            </div>
          </div>`).join('')}
      </div>`;

    if (selectEl) {
      selectEl.innerHTML = '<option value="">Sélectionner un nœud (optionnel)</option>' +
        _proxmoxNodes
          .filter(n => n.status === 'online')
          .map(n => `<option value="${escHtml(n.node || n.name || '')}">${escHtml(n.node || n.name || '?')}</option>`)
          .join('');
    }
  } catch (err) {
    listEl.innerHTML = `
      <div class="alert alert-warning">
        API PVE non disponible: ${err.message}<br>
        <small>Configurez l'URL dans Paramètres → Proxmox, ou utilisez les serveurs SSH ci-dessus.</small>
      </div>`;
    if (selectEl) selectEl.innerHTML = '<option value="">API PVE non configurée</option>';
  }
}


// ── Test LLM ──────────────────────────────────────────────────────────────────

async function runProxmoxTest(event) {
  event.preventDefault();
  const alertId = 'proxmox-test-alert';
  clearAlert(alertId);

  const node       = document.getElementById('prx-node').value;
  const model      = document.getElementById('prx-model').value.trim();
  const prompt     = document.getElementById('prx-prompt').value.trim();
  const iterations = parseInt(document.getElementById('prx-iterations').value, 10) || 1;

  if (!model) {
    showAlert(alertId, 'Entrez un nom de modèle Ollama.', 'error');
    return;
  }

  const btn = document.getElementById('prx-run-btn');
  setLoading(btn, true);

  try {
    const result = await Api.post('/admin/proxmox/test', { node, model, prompt, iterations });
    showProxmoxResult(result);
    await refreshProxmoxJobs();
  } catch (err) {
    showAlert(alertId, 'Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function showProxmoxResult(result) {
  const modal = document.getElementById('proxmox-result-modal');
  const body  = document.getElementById('proxmox-result-body');
  if (!modal || !body) return;

  const statusBadge = result.success
    ? '<span class="badge badge-success">Succès</span>'
    : '<span class="badge badge-error">Échec</span>';

  body.innerHTML = `
    <div class="proxmox-result">
      <div class="result-meta">
        <div class="result-meta-grid">
          <div><strong>Nœud</strong><span>${escHtml(result.node || '—')}</span></div>
          <div><strong>Modèle</strong><span>${escHtml(result.model || '—')}</span></div>
          <div><strong>Statut</strong><span>${statusBadge}</span></div>
          ${result.latency_ms !== undefined ? `<div><strong>Latence</strong><span>${result.latency_ms} ms</span></div>` : ''}
        </div>
      </div>
      <div class="result-response">
        <strong>${result.success ? 'Réponse' : 'Erreur'}</strong>
        <pre class="code-block">${escHtml(result.success ? (result.response || '') : (result.error || 'Erreur inconnue'))}</pre>
      </div>
    </div>`;

  modal.style.display = 'flex';
}

function closeProxmoxModal() {
  const modal = document.getElementById('proxmox-result-modal');
  if (modal) modal.style.display = 'none';
}


// ── Historique ────────────────────────────────────────────────────────────────

async function refreshProxmoxJobs() {
  const listEl = document.getElementById('proxmox-jobs-list');
  if (!listEl) return;

  try {
    const data = await Api.get('/admin/proxmox/test/history');
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
      listEl.innerHTML = '<p class="text-muted text-center">Aucun test effectué. L\'historique persistant est prévu en v4.2.</p>';
      return;
    }

    listEl.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Date</th><th>Nœud</th><th>Modèle</th><th>Latence</th><th>Statut</th></tr>
        </thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td>${fmtDate(j.created_at)}</td>
              <td>${escHtml(j.node || '—')}</td>
              <td><code>${escHtml(j.model || '—')}</code></td>
              <td>${j.latency_ms !== undefined ? j.latency_ms + ' ms' : '—'}</td>
              <td><span class="badge badge-${j.success ? 'success' : 'error'}">${j.success ? 'OK' : 'Erreur'}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    listEl.innerHTML = '<p class="text-muted">Historique indisponible.</p>';
  }
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
