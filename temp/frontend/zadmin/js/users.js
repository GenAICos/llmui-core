// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Utilisateurs

let _usersPage = 1;
let _usersSearch = '';

registerTab('users', (container) => loadUsers(container));

async function loadUsers(container) {
  container.innerHTML = `
    <div class="toolbar">
      <input class="search-input" type="text" id="users-search" placeholder="Rechercher (email, nom)..." value="${_usersSearch}">
      <button class="btn btn-primary" id="create-user-btn">+ Nouvel utilisateur</button>
      <button class="btn btn-secondary" onclick="loadUsers(document.getElementById('tab-users'))">Actualiser</button>
    </div>
    <div id="users-content"><div class="spinner" style="display:block;margin:2rem auto"></div></div>
  `;

  document.getElementById('users-search')?.addEventListener('input', (e) => {
    _usersSearch = e.target.value;
    _usersPage = 1;
    fetchUsers();
  });

  document.getElementById('create-user-btn')?.addEventListener('click', showCreateUserModal);

  fetchUsers();
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  const now = new Date();
  const expired = d <= now;
  const label = d.toLocaleDateString('fr-CA');
  return { expired, label, d };
}

async function fetchUsers() {
  const content = document.getElementById('users-content');
  if (!content) return;

  try {
    const params = new URLSearchParams({ page: _usersPage, per_page: 20, search: _usersSearch });
    const data = await Api.get(`/admin/users/?${params}`);

    content.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Email</th><th>Nom</th><th>Rôles</th><th>Statut</th><th>TOTP</th><th>Expiration</th><th>Créé le</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${data.items.map(u => {
              const expiry = formatExpiry(u.expires_at);
              let expiryCell = '<span style="color:var(--color-text-muted);font-size:0.75rem">—</span>';
              if (expiry) {
                const color = expiry.expired ? 'danger' : 'warning';
                const icon = expiry.expired ? '✕' : '⏳';
                expiryCell = `<span class="badge badge-${color}" title="${expiry.expired ? 'Expiré' : 'Expire le'} ${expiry.label}">${icon} ${expiry.label}</span>`;
              }
              return `
                <tr${expiry?.expired ? ' style="opacity:0.65"' : ''}>
                  <td>${u.email}${u.expires_at ? ' <span class="badge badge-info" style="font-size:0.65rem">éphémère</span>' : ''}</td>
                  <td>${u.full_name || '—'}</td>
                  <td>${u.roles.map(r => `<span class="badge badge-primary">${r}</span>`).join(' ')}</td>
                  <td><span class="badge badge-${u.is_active ? 'success' : 'danger'}">${u.is_active ? 'Actif' : 'Inactif'}</span></td>
                  <td><span class="badge badge-${u.has_totp ? 'success' : 'warning'}">${u.has_totp ? 'Activé' : 'Désactivé'}</span></td>
                  <td>${expiryCell}</td>
                  <td style="color:var(--color-text-secondary);font-size:0.75rem">${new Date(u.created_at).toLocaleDateString('fr-CA')}</td>
                  <td>
                    <div style="display:flex;gap:0.25rem">
                      <button class="btn btn-secondary btn-sm" onclick="showEditUserModal(${u.id})">Modifier</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${u.email}')">Suppr.</button>
                      <button class="btn btn-secondary btn-sm" onclick="revokeSessions(${u.id})">Sessions</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination" style="margin-top:1rem">
        ${Array.from({length: data.pages}, (_, i) => i + 1).map(p => `
          <button class="${p === data.page ? 'active' : ''}" onclick="_usersPage=${p};fetchUsers()">${p}</button>
        `).join('')}
      </div>
      <p style="text-align:center;color:var(--color-text-muted);font-size:0.75rem;margin-top:0.5rem">${data.total} utilisateur(s)</p>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">Erreur: ${err.message}</div>`;
  }
}

async function showCreateUserModal() {
  let allRoles = [];
  try { allRoles = await Api.get('/admin/roles/'); } catch (_) {}

  if (!allRoles.length) {
    showToast('Impossible de charger les rôles disponibles', 'error');
    return;
  }
  const roleOptions = allRoles.map(r =>
    `<option value="${r.name}">${r.name}${r.label ? ` — ${r.label}` : ''}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Nouvel utilisateur</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-user-alert"></div>
      <form id="create-user-form">
        <div class="form-group"><label>Email *</label><input type="email" name="email" required></div>
        <div class="form-group"><label>Mot de passe *</label><input type="password" name="password" required></div>
        <div class="form-group"><label>Nom complet</label><input type="text" name="full_name"></div>
        <div class="form-group">
          <label>Rôle</label>
          <select name="role">${roleOptions}</select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:0.5rem">
            <input type="checkbox" id="create-ephemeral-toggle" style="width:16px;height:16px;accent-color:#fff;background:#000;border:1px solid #555">
            Compte éphémère (désactivation automatique)
          </label>
        </div>
        <div id="create-expiry-group" class="form-group" style="display:none;margin-left:1.5rem">
          <label>Date de désactivation *</label>
          <input type="datetime-local" name="expires_at" id="create-expires-at">
          <small style="color:var(--color-text-muted)">Le compte sera automatiquement désactivé à cette date.</small>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-ephemeral-toggle').addEventListener('change', (e) => {
    const group = modal.querySelector('#create-expiry-group');
    const input = modal.querySelector('#create-expires-at');
    group.style.display = e.target.checked ? 'block' : 'none';
    input.required = e.target.checked;
  });

  modal.querySelector('#create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isEphemeral = modal.querySelector('#create-ephemeral-toggle').checked;
    const expiresRaw = fd.get('expires_at');

    const payload = {
      email: fd.get('email'),
      password: fd.get('password'),
      full_name: fd.get('full_name') || null,
      role_names: [fd.get('role')],
      expires_at: isEphemeral && expiresRaw ? new Date(expiresRaw).toISOString() : null,
    };

    try {
      await Api.post('/admin/users/', payload);
      modal.remove();
      showToast('Utilisateur créé', 'success');
      fetchUsers();
    } catch (err) {
      showAlert('create-user-alert', err.message);
    }
  });
}

async function showEditUserModal(userId) {
  try {
    const user = await Api.get(`/admin/users/${userId}`);
    const hasExpiry = !!user.expires_at;

    // Format expires_at for datetime-local input (strips seconds/timezone)
    let expiresLocal = '';
    if (user.expires_at) {
      const d = new Date(user.expires_at);
      expiresLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Modifier ${user.email}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div id="edit-user-alert"></div>
        <form id="edit-user-form">
          <div class="form-group"><label>Nom complet</label><input name="full_name" value="${user.full_name || ''}"></div>
          <div class="form-group">
            <label>Statut</label>
            <label class="toggle" style="margin-top:0.25rem">
              <input type="checkbox" name="is_active" ${user.is_active ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:0.5rem">
              <input type="checkbox" id="edit-ephemeral-toggle" ${hasExpiry ? 'checked' : ''} style="width:16px;height:16px;accent-color:#fff;background:#000;border:1px solid #555">
              Compte éphémère (désactivation automatique)
            </label>
          </div>
          <div id="edit-expiry-group" class="form-group" style="display:${hasExpiry ? 'block' : 'none'};margin-left:1.5rem">
            <label>Date de désactivation</label>
            <input type="datetime-local" name="expires_at" id="edit-expires-at" value="${expiresLocal}">
            <small style="color:var(--color-text-muted)">Le compte sera automatiquement désactivé à cette date.</small>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    `;
    document.getElementById('modal-container').appendChild(modal);

    modal.querySelector('#edit-ephemeral-toggle').addEventListener('change', (e) => {
      const group = modal.querySelector('#edit-expiry-group');
      group.style.display = e.target.checked ? 'block' : 'none';
    });

    modal.querySelector('#edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const isEphemeral = modal.querySelector('#edit-ephemeral-toggle').checked;
      const expiresRaw = fd.get('expires_at');

      const payload = {
        full_name: fd.get('full_name') || null,
        is_active: fd.has('is_active'),
      };

      if (!isEphemeral) {
        payload.clear_expiry = true;
      } else if (expiresRaw) {
        payload.expires_at = new Date(expiresRaw).toISOString();
      }

      try {
        await Api.put(`/admin/users/${userId}`, payload);
        modal.remove();
        showToast('Utilisateur mis à jour', 'success');
        fetchUsers();
      } catch (err) {
        showAlert('edit-user-alert', err.message);
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUser(userId, email) {
  if (!confirm(`Supprimer l'utilisateur ${email} ?`)) return;
  try {
    await Api.delete(`/admin/users/${userId}`);
    showToast('Utilisateur supprimé', 'success');
    fetchUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function revokeSessions(userId) {
  if (!confirm('Révoquer toutes les sessions de cet utilisateur ?')) return;
  try {
    await Api.post(`/admin/users/${userId}/disable-sessions`);
    showToast('Sessions révoquées', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
