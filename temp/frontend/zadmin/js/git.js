// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// LLMUI Entreprise v4.3 — /zadmin git Connector tab

'use strict';

registerTab('git', (container) => loadGit(container));

let _gitConnectors = [];
let _editingConnectorId = null;

async function loadGit(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>git Connector</h2>
      <button class="btn btn-primary" onclick="openGitModal()">+ Ajouter un connecteur</button>
    </div>
    <div id="git-alert"></div>
    <div id="git-connectors-list">
      <div class="spinner"></div>
    </div>

    <!-- Connector Modal -->
    <div class="modal-overlay" id="git-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h3 id="git-modal-title">Nouveau connecteur Git</h3>
          <button class="modal-close" onclick="closeGitModal()">×</button>
        </div>
        <div class="modal-body">
          <div id="git-modal-alert"></div>
          <form id="git-modal-form" onsubmit="saveConnector(event)">
            <div class="form-group">
              <label for="git-name">Nom *</label>
              <input type="text" id="git-name" class="form-control" required placeholder="ex: Repo principal">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="git-provider">Fournisseur *</label>
                <select id="git-provider" class="form-control" required>
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                  <option value="gitea">Gitea</option>
                  <option value="bitbucket">Bitbucket</option>
                </select>
              </div>
              <div class="form-group">
                <label for="git-branch">Branche</label>
                <input type="text" id="git-branch" class="form-control" value="main" placeholder="main">
              </div>
            </div>
            <div class="form-group">
              <label for="git-repo-url">URL du dépôt *</label>
              <input type="url" id="git-repo-url" class="form-control" required placeholder="https://github.com/org/repo">
            </div>
            <div class="form-group" id="git-base-url-group">
              <label for="git-base-url">URL de base (instances auto-hébergées)</label>
              <input type="url" id="git-base-url" class="form-control" placeholder="https://gitlab.exemple.com">
            </div>
            <div class="form-group">
              <label for="git-username">Nom d'utilisateur</label>
              <input type="text" id="git-username" class="form-control" placeholder="optionnel">
            </div>
            <div class="form-group">
              <label for="git-token">Token d'accès <span class="badge badge-warning">Chiffré</span></label>
              <div class="input-group">
                <input type="password" id="git-token" class="form-control"
                       placeholder="ghp_... ou token GitLab">
                <button type="button" class="btn btn-secondary" onclick="togglePasswordVisibility('git-token')">👁</button>
              </div>
            </div>
            <div class="form-group">
              <label for="git-sync-interval">Intervalle de sync (minutes)</label>
              <input type="number" id="git-sync-interval" class="form-control" value="60" min="5" max="1440">
            </div>
            <div class="form-group form-group-toggle">
              <label>Actif</label>
              <label class="toggle">
                <input type="checkbox" id="git-active" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGitModal()">Annuler</button>
          <button class="btn btn-primary" onclick="document.getElementById('git-modal-form').requestSubmit()" id="git-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Branches/Commits Modal -->
    <div class="modal-overlay" id="git-detail-modal" style="display:none">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="git-detail-title">Détails du connecteur</h3>
          <button class="modal-close" onclick="closeGitDetailModal()">×</button>
        </div>
        <div class="modal-body" id="git-detail-body"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGitDetailModal()">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div class="modal-overlay" id="git-delete-modal" style="display:none">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Supprimer le connecteur</h3>
          <button class="modal-close" onclick="closeGitDeleteModal()">×</button>
        </div>
        <div class="modal-body">
          <p>Supprimer <strong id="git-delete-name"></strong> ?</p>
          <p class="text-muted">Cette action est irréversible.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGitDeleteModal()">Annuler</button>
          <button class="btn btn-danger" onclick="confirmDeleteConnector()" id="git-confirm-delete-btn">Supprimer</button>
        </div>
      </div>
    </div>
  `;

  await fetchConnectors();
}

async function fetchConnectors() {
  const listEl = document.getElementById('git-connectors-list');
  if (!listEl) return;

  try {
    const data = await Api.get('/admin/git/connectors/');
    _gitConnectors = data.connectors || data || [];
    renderConnectors();
  } catch (err) {
    listEl.innerHTML = `<div class="alert alert-error">Erreur: ${err.message}</div>`;
  }
}

function renderConnectors() {
  const listEl = document.getElementById('git-connectors-list');
  if (!listEl) return;

  if (_gitConnectors.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <h3>Aucun connecteur Git</h3>
        <p>Connectez vos dépôts Git pour les utiliser comme sources RAG ou déclencher des CI.</p>
        <button class="btn btn-primary" onclick="openGitModal()">+ Ajouter un connecteur</button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = `
    <div class="git-connectors-grid">
      ${_gitConnectors.map(c => renderConnectorCard(c)).join('')}
    </div>
  `;
}

function renderConnectorCard(c) {
  const providerIcons = { github: '🐙', gitlab: '🦊', gitea: '☕', bitbucket: '🪣' };
  const icon = providerIcons[c.provider] || '🔗';
  const statusClass = c.last_sync_at === null ? 'secondary'
    : c.last_sync_success === true ? 'success'
    : c.last_sync_success === false ? 'error'
    : 'warning';
  const statusLabel = c.last_sync_at === null ? 'Jamais'
    : c.last_sync_success === true ? 'OK'
    : c.last_sync_success === false ? 'Erreur'
    : 'Inconnu';

  return `
    <div class="card connector-card ${!c.is_active ? 'connector-inactive' : ''}">
      <div class="connector-card-header">
        <div class="connector-identity">
          <span class="connector-icon">${icon}</span>
          <div>
            <strong>${escapeHtml(c.name)}</strong>
            <span class="badge badge-${c.is_active ? 'success' : 'secondary'}">${c.is_active ? 'Actif' : 'Inactif'}</span>
          </div>
        </div>
        <div class="connector-actions">
          <button class="btn btn-secondary btn-sm" onclick="testConnector(${c.id})" title="Tester la connexion">✓ Tester</button>
          <button class="btn btn-primary btn-sm" onclick="syncConnector(${c.id})" title="Synchroniser">↻ Sync</button>
          <button class="btn btn-secondary btn-sm" onclick="viewConnectorDetail(${c.id})" title="Voir détails">🔍</button>
          <button class="btn btn-secondary btn-sm" onclick="openGitModal(${c.id})" title="Modifier">✎</button>
          <button class="btn btn-danger btn-sm" onclick="promptDeleteConnector(${c.id})" title="Supprimer">🗑</button>
        </div>
      </div>
      <div class="connector-card-body">
        <div class="connector-meta">
          <div>
            <span class="meta-label">Dépôt</span>
            <a href="${escapeHtml(c.repo_url)}" target="_blank" rel="noopener" class="connector-url">${escapeHtml(c.repo_url)}</a>
          </div>
          <div>
            <span class="meta-label">Branche</span>
            <code>${escapeHtml(c.branch || 'main')}</code>
          </div>
          <div>
            <span class="meta-label">Fournisseur</span>
            <span>${icon} ${c.provider}</span>
          </div>
          <div>
            <span class="meta-label">Sync auto</span>
            <span>${c.sync_interval_minutes ? c.sync_interval_minutes + ' min' : 'Désactivé'}</span>
          </div>
        </div>
        <div class="connector-sync-status">
          <span class="meta-label">Dernier sync :</span>
          <span class="badge badge-${statusClass}">${statusLabel}</span>
          ${c.last_sync_at ? `<span class="text-muted">${formatDate(c.last_sync_at)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function openGitModal(connectorId = null) {
  _editingConnectorId = connectorId;
  const modal = document.getElementById('git-modal');
  const title = document.getElementById('git-modal-title');
  const form = document.getElementById('git-modal-form');
  const alertEl = document.getElementById('git-modal-alert');

  clearAlert('git-modal-alert');
  form.reset();

  if (connectorId) {
    const c = _gitConnectors.find(x => x.id === connectorId);
    if (!c) return;
    title.textContent = 'Modifier le connecteur';
    document.getElementById('git-name').value = c.name || '';
    document.getElementById('git-provider').value = c.provider || 'github';
    document.getElementById('git-repo-url').value = c.repo_url || '';
    document.getElementById('git-base-url').value = c.base_url || '';
    document.getElementById('git-branch').value = c.branch || 'main';
    document.getElementById('git-username').value = c.username || '';
    document.getElementById('git-sync-interval').value = c.sync_interval_minutes || 60;
    document.getElementById('git-active').checked = c.is_active !== false;
    // Token stays empty — user must re-enter to change
  } else {
    title.textContent = 'Nouveau connecteur Git';
    document.getElementById('git-active').checked = true;
  }

  modal.style.display = 'flex';
}

function closeGitModal() {
  document.getElementById('git-modal').style.display = 'none';
  _editingConnectorId = null;
}

async function saveConnector(event) {
  event.preventDefault();
  clearAlert('git-modal-alert');

  const payload = {
    name: document.getElementById('git-name').value.trim(),
    provider: document.getElementById('git-provider').value,
    repo_url: document.getElementById('git-repo-url').value.trim(),
    base_url: document.getElementById('git-base-url').value.trim() || null,
    branch: document.getElementById('git-branch').value.trim() || 'main',
    username: document.getElementById('git-username').value.trim() || null,
    sync_interval_minutes: parseInt(document.getElementById('git-sync-interval').value, 10) || 60,
    is_active: document.getElementById('git-active').checked,
  };

  const token = document.getElementById('git-token').value.trim();
  if (token) payload.token = token;

  const btn = document.getElementById('git-save-btn');
  setLoading(btn, true);

  try {
    if (_editingConnectorId) {
      await Api.put(`/admin/git/connectors/${_editingConnectorId}/`, payload);
      showToast('Connecteur mis à jour.', 'success');
    } else {
      await Api.post('/admin/git/connectors/', payload);
      showToast('Connecteur créé.', 'success');
    }
    closeGitModal();
    await fetchConnectors();
  } catch (err) {
    showAlert('git-modal-alert', 'Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function testConnector(connectorId) {
  const alertId = 'git-alert';
  clearAlert(alertId);
  try {
    const result = await Api.post(`/admin/git/connectors/${connectorId}/test/`, {});
    if (result.success) {
      showAlert(alertId, `Connexion réussie au dépôt.`, 'success');
    } else {
      showAlert(alertId, `Échec: ${result.error || 'Erreur inconnue'}`, 'error');
    }
  } catch (err) {
    showAlert(alertId, 'Test de connexion échoué: ' + err.message, 'error');
  }
}

async function syncConnector(connectorId) {
  const alertId = 'git-alert';
  clearAlert(alertId);
  const btn = event.target;
  setLoading(btn, true);

  try {
    const result = await Api.post(`/admin/git/sync/${connectorId}`, {});
    showAlert(alertId, `Sync démarré — ${result.message || 'En cours...'}`, 'success');
    setTimeout(() => fetchConnectors(), 2000);
  } catch (err) {
    showAlert(alertId, 'Erreur de synchronisation: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function viewConnectorDetail(connectorId) {
  const modal = document.getElementById('git-detail-modal');
  const title = document.getElementById('git-detail-title');
  const body = document.getElementById('git-detail-body');
  const c = _gitConnectors.find(x => x.id === connectorId);

  title.textContent = c ? c.name : 'Détails';
  body.innerHTML = '<div class="spinner"></div>';
  modal.style.display = 'flex';

  try {
    const [branches, commits] = await Promise.allSettled([
      Api.get(`/admin/git/connectors/${connectorId}/branches`),
      Api.get(`/admin/git/connectors/${connectorId}/commits`),
    ]);

    const branchList = branches.status === 'fulfilled'
      ? (branches.value.branches || branches.value || [])
      : [];
    const commitList = commits.status === 'fulfilled'
      ? (commits.value.commits || commits.value || [])
      : [];

    body.innerHTML = `
      <div class="git-detail-grid">
        <div>
          <h4>Branches (${branchList.length})</h4>
          ${branchList.length > 0
            ? `<ul class="branch-list">${branchList.map(b => `<li><code>${escapeHtml(b)}</code></li>`).join('')}</ul>`
            : '<p class="text-muted">Aucune branche disponible.</p>'
          }
        </div>
        <div>
          <h4>Derniers commits</h4>
          ${commitList.length > 0
            ? `<div class="commit-list">${commitList.slice(0, 10).map(commit => `
                <div class="commit-item">
                  <code class="commit-sha">${escapeHtml(String(commit.sha || commit.id || '').slice(0, 7))}</code>
                  <span class="commit-message">${escapeHtml(commit.message || commit.title || '—')}</span>
                  <span class="commit-author text-muted">${escapeHtml(commit.author || '—')}</span>
                  <span class="commit-date text-muted">${formatDate(commit.date || commit.created_at)}</span>
                </div>
              `).join('')}</div>`
            : '<p class="text-muted">Aucun commit disponible.</p>'
          }
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-error">Erreur: ${err.message}</div>`;
  }
}

function closeGitDetailModal() {
  document.getElementById('git-detail-modal').style.display = 'none';
}

let _deleteConnectorId = null;

function promptDeleteConnector(connectorId) {
  _deleteConnectorId = connectorId;
  const c = _gitConnectors.find(x => x.id === connectorId);
  document.getElementById('git-delete-name').textContent = c ? c.name : connectorId;
  document.getElementById('git-delete-modal').style.display = 'flex';
}

function closeGitDeleteModal() {
  document.getElementById('git-delete-modal').style.display = 'none';
  _deleteConnectorId = null;
}

async function confirmDeleteConnector() {
  if (!_deleteConnectorId) return;
  const btn = document.getElementById('git-confirm-delete-btn');
  setLoading(btn, true);

  try {
    await Api.delete(`/admin/git/connectors/${_deleteConnectorId}`);
    showToast('Connecteur supprimé.', 'success');
    closeGitDeleteModal();
    await fetchConnectors();
  } catch (err) {
    showToast('Erreur lors de la suppression: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
