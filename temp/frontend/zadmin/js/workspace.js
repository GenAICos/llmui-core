// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Workspaces Andy — onglet /zadmin (v4.3)

let _workspaces = [];

registerTab('workspaces', loadWorkspaces);

async function loadWorkspaces(container) {
  container.innerHTML = '<div class="loading">Chargement des workspaces…</div>';
  try {
    _workspaces = await Api.get('/support/workspaces/');
    _renderWorkspaces(container);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function _renderWorkspaces(container) {
  const total = _workspaces.length;
  const systemWs = _workspaces.filter(w => w.is_system);
  const userWs = _workspaces.filter(w => !w.is_system);

  container.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
      <div>
        <h2 style="margin:0 0 0.25rem">Workspaces Andy</h2>
        <p style="margin:0;color:var(--color-text-secondary);font-size:0.875rem">
          ${total} workspace(s) — ${systemWs.length} système, ${userWs.length} projet(s)
        </p>
      </div>
      <button class="btn btn-primary" onclick="showCreateWorkspaceModal()">+ Nouveau workspace</button>
    </div>

    ${systemWs.length > 0 ? `
    <div style="margin-bottom:2rem">
      <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem">
        Workspace système
      </h3>
      ${systemWs.map(w => _renderWorkspaceCard(w)).join('')}
    </div>` : ''}

    <div>
      <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem">
        Projets
      </h3>
      ${userWs.length === 0
        ? '<div class="alert alert-info">Aucun workspace projet. Créez-en un ou laissez Andy en créer un via le chat.</div>'
        : userWs.map(w => _renderWorkspaceCard(w)).join('')
      }
    </div>
  `;
}

function _renderWorkspaceCard(ws) {
  const fileCount = ws.file_count ?? 0;
  const memberCount = ws.member_count ?? 0;
  const created = ws.created_at ? new Date(ws.created_at).toLocaleDateString('fr-CA') : '—';
  return `
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem">
            <strong style="font-size:1rem">${escHtml(ws.name)}</strong>
            ${ws.is_system ? '<span class="badge badge-warning">Système Andy</span>' : ''}
            <span class="badge badge-info">${fileCount} fichier${fileCount !== 1 ? 's' : ''}</span>
            <span class="badge badge-secondary">${memberCount} membre${memberCount !== 1 ? 's' : ''}</span>
          </div>
          ${ws.description ? `<p style="margin:0.25rem 0 0;color:var(--color-text-secondary);font-size:0.875rem">${escHtml(ws.description)}</p>` : ''}
          <p style="margin:0.25rem 0 0;font-size:0.75rem;color:var(--color-text-muted)">Créé le ${created}</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="showWorkspaceDetail(${ws.id})">Détail</button>
          ${!ws.is_system ? `<button class="btn btn-danger btn-sm" onclick="deleteWorkspace(${ws.id}, '${escHtml(ws.name).replace(/'/g, "\\'")}')">Suppr.</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Créer un workspace ────────────────────────────────────────────────────────

function showCreateWorkspaceModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <h3 class="modal-title">Nouveau workspace</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-ws-alert"></div>
      <form id="create-ws-form">
        <div class="form-group">
          <label>Nom du workspace *</label>
          <input name="name" required placeholder="mon-projet" autofocus>
        </div>
        <div class="form-group">
          <label>Description (optionnelle)</label>
          <textarea name="description" rows="2" placeholder="Description du projet…"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-ws-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post('/support/workspaces/', {
        name: fd.get('name'),
        description: fd.get('description') || null,
      });
      modal.remove();
      showToast('Workspace créé', 'success');
      loadWorkspaces(document.getElementById('tab-workspaces'));
    } catch (err) {
      showAlert('create-ws-alert', err.message);
    }
  });
}

// ── Supprimer un workspace ────────────────────────────────────────────────────

async function deleteWorkspace(wsId, wsName) {
  if (!confirm(`Supprimer le workspace "${wsName}" et tous ses fichiers ?`)) return;
  try {
    await Api.delete(`/support/workspaces/${wsId}`);
    showToast('Workspace supprimé', 'success');
    loadWorkspaces(document.getElementById('tab-workspaces'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Détail d'un workspace ─────────────────────────────────────────────────────

async function showWorkspaceDetail(wsId) {
  let ws;
  try {
    ws = await Api.get(`/support/workspaces/${wsId}`);
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }

  const files = ws.files || [];
  const members = ws.members || [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:720px">
      <div class="modal-header">
        <h3 class="modal-title">
          ${escHtml(ws.name)}
          ${ws.is_system ? ' <span class="badge badge-warning" style="font-size:0.75rem">Système Andy</span>' : ''}
        </h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      ${ws.description ? `<p style="margin:0 0 1rem;color:var(--color-text-secondary)">${escHtml(ws.description)}</p>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">

        <div>
          <h4 style="font-size:0.875rem;font-weight:600;margin:0 0 0.75rem">
            Fichiers (${files.length})
          </h4>
          ${files.length === 0
            ? '<p style="color:var(--color-text-muted);font-size:0.875rem">Aucun fichier.</p>'
            : `<div style="max-height:300px;overflow-y:auto">
                <table class="table" style="font-size:0.8rem">
                  <thead><tr><th>Chemin</th><th>Taille</th></tr></thead>
                  <tbody>
                    ${files.map(f => `
                      <tr>
                        <td><code>${escHtml(f.path)}</code></td>
                        <td>${f.size_chars ?? 0} car.</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>`
          }
        </div>

        <div>
          <h4 style="font-size:0.875rem;font-weight:600;margin:0 0 0.75rem">
            Membres (${members.length})
          </h4>
          ${members.length === 0
            ? '<p style="color:var(--color-text-muted);font-size:0.875rem">Aucun membre.</p>'
            : `<div style="display:flex;flex-direction:column;gap:0.5rem">
                ${members.map(m => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;background:var(--color-bg);border-radius:var(--radius-md)">
                    <span style="font-size:0.875rem">${escHtml(m.email)}</span>
                    <span class="badge badge-${m.role === 'owner' ? 'success' : 'info'}">${m.role}</span>
                  </div>
                `).join('')}
              </div>`
          }
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
        ${!ws.is_system ? `<button type="button" class="btn btn-danger" onclick="this.closest('.modal-overlay').remove();deleteWorkspace(${ws.id},'${escHtml(ws.name).replace(/'/g,"\\'")}')">Supprimer</button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);
}
