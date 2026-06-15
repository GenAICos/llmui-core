// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Groupes & Rôles

registerTab('roles', (container) => loadRoles(container));

async function loadRoles(container) {
  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-subtab="roles-list">Rôles</button>
      <button class="tab-btn" data-subtab="groups-list">Groupes</button>
      <button class="tab-btn" data-subtab="permissions-matrix">Matrice de permissions</button>
    </div>
    <div id="subtab-roles-list"></div>
    <div id="subtab-groups-list" style="display:none"></div>
    <div id="subtab-permissions-matrix" style="display:none"></div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('[id^="subtab-"]').forEach(el => el.style.display = 'none');
      const target = document.getElementById(`subtab-${btn.dataset.subtab}`);
      if (target) target.style.display = 'block';

      if (btn.dataset.subtab === 'roles-list') loadRolesList();
      if (btn.dataset.subtab === 'groups-list') loadGroupsList();
      if (btn.dataset.subtab === 'permissions-matrix') loadMatrix();
    });
  });

  loadRolesList();
}

async function loadRolesList() {
  const container = document.getElementById('subtab-roles-list');
  if (!container) return;
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';

  try {
    const roles = await Api.get('/admin/roles/');
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showCreateRoleModal()">+ Nouveau rôle</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Nom</th><th>Label</th><th>Type</th><th>Permissions</th><th>Actions</th></tr></thead>
          <tbody>
            ${roles.map(r => `
              <tr>
                <td><code>${r.name}</code></td>
                <td>${r.label || '—'}</td>
                <td><span class="badge badge-${r.is_system ? 'warning' : 'info'}">${r.is_system ? 'Système' : 'Personnalisé'}</span></td>
                <td style="font-size:0.75rem">${r.permissions.slice(0, 3).join(', ')}${r.permissions.length > 3 ? ` <em>+${r.permissions.length - 3}</em>` : ''}</td>
                <td>
                  ${!r.is_system ? `
                    <button class="btn btn-secondary btn-sm" onclick="showEditRoleModal(${r.id})">Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRole(${r.id}, '${r.name}')">Suppr.</button>
                  ` : '<span style="color:var(--color-text-muted);font-size:0.75rem">Immuable</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadGroupsList() {
  const container = document.getElementById('subtab-groups-list');
  if (!container) return;
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';

  try {
    const groups = await Api.get('/admin/roles/groups/');
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showCreateGroupModal()">+ Nouveau groupe</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Nom</th><th>Description</th><th>Rôles assignés</th><th>Actions</th></tr></thead>
          <tbody>
            ${groups.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted)">Aucun groupe</td></tr>' : ''}
            ${groups.map(g => `
              <tr>
                <td><strong>${g.name}</strong></td>
                <td>${g.description || '—'}</td>
                <td>${g.roles.length ? g.roles.map(r => `<span class="badge badge-primary">${r}</span>`).join(' ') : '<em style="color:var(--color-text-muted)">Aucun</em>'}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="showEditGroupModal(${g.id}, '${g.name}')">Modifier</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteGroup(${g.id}, '${g.name}')">Suppr.</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadMatrix() {
  const container = document.getElementById('subtab-permissions-matrix');
  if (!container) return;
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';

  try {
    const data = await Api.get('/admin/roles/matrix/');
    const { permissions, roles, matrix } = data;

    container.innerHTML = `
      <div style="margin-bottom:1rem;color:var(--color-text-muted);font-size:0.85rem">
        Cliquez sur une case pour basculer la permission (rôles personnalisés uniquement).
      </div>
      <div class="table-container" style="overflow-x:auto">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>Permission</th>
              ${roles.map(r => `<th style="text-align:center;white-space:nowrap">${r.label || r.name}${r.is_system ? '<br><span style="font-size:0.65rem;color:var(--color-text-muted)">système</span>' : ''}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${permissions.map(p => `
              <tr>
                <td>
                  <code style="font-size:0.8rem">${p.name}</code>
                  ${p.description ? `<br><span style="font-size:0.7rem;color:var(--color-text-muted)">${p.description}</span>` : ''}
                </td>
                ${roles.map(r => {
                  const checked = (matrix[r.name] || []).includes(p.name);
                  const editable = !r.is_system;
                  return `
                    <td class="matrix-check" style="${editable ? 'cursor:pointer' : ''}"
                        ${editable ? `onclick="toggleMatrixPerm(${r.id}, '${r.name}', '${p.name}', this)"` : ''}>
                      <input type="checkbox" ${checked ? 'checked' : ''} ${editable ? '' : 'disabled'}
                             style="pointer-events:none;width:16px;height:16px;accent-color:#fff;background:#000;border:1px solid #555">
                    </td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function toggleMatrixPerm(roleId, roleName, permName, cell) {
  const checkbox = cell.querySelector('input[type=checkbox]');
  const wasChecked = checkbox.checked;

  // Optimistic UI update
  checkbox.checked = !wasChecked;

  try {
    const currentData = await Api.get('/admin/roles/matrix/');
    const currentPerms = currentData.matrix[roleName] || [];
    let newPerms;
    if (wasChecked) {
      newPerms = currentPerms.filter(p => p !== permName);
    } else {
      newPerms = [...currentPerms, permName];
    }
    await Api.put(`/admin/roles/${roleId}`, { permission_names: newPerms });
    showToast('Permission mise à jour', 'success');
  } catch (err) {
    // Revert on error
    checkbox.checked = wasChecked;
    showToast(err.message, 'error');
  }
}

function buildPermissionCheckboxes(allPermissions, selected, containerId) {
  const byResource = {};
  for (const p of allPermissions) {
    if (!byResource[p.resource]) byResource[p.resource] = [];
    byResource[p.resource].push(p);
  }

  return `
    <div id="${containerId}" style="max-height:220px;overflow-y:auto;border:1px solid var(--color-border);border-radius:4px;padding:0.5rem">
      ${Object.entries(byResource).map(([resource, perms]) => `
        <div style="margin-bottom:0.5rem">
          <div style="font-size:0.75rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:0.25rem">${resource}</div>
          ${perms.map(p => `
            <label style="display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0.25rem;cursor:pointer;border-radius:3px">
              <input type="checkbox" name="perm_${p.name}" value="${p.name}" ${selected.includes(p.name) ? 'checked' : ''} style="width:16px;height:16px;accent-color:#fff;background:#000;border:1px solid #555">
              <code style="font-size:0.8rem">${p.name}</code>
              ${p.description ? `<span style="font-size:0.75rem;color:var(--color-text-muted)">— ${p.description}</span>` : ''}
            </label>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function buildRoleCheckboxes(allRoles, selected, containerId) {
  return `
    <div id="${containerId}" style="max-height:180px;overflow-y:auto;border:1px solid var(--color-border);border-radius:4px;padding:0.5rem">
      ${allRoles.length === 0 ? '<em style="color:var(--color-text-muted)">Aucun rôle disponible</em>' : ''}
      ${allRoles.map(r => `
        <label style="display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0.25rem;cursor:pointer;border-radius:3px">
          <input type="checkbox" name="role_${r.name}" value="${r.name}" ${selected.includes(r.name) ? 'checked' : ''} style="width:16px;height:16px;accent-color:#fff;background:#000;border:1px solid #555">
          <code style="font-size:0.8rem">${r.name}</code>
          ${r.label ? `<span style="color:var(--color-text-muted);font-size:0.8rem">— ${r.label}</span>` : ''}
        </label>
      `).join('')}
    </div>
  `;
}

function getCheckedValues(form, prefix) {
  const results = [];
  form.querySelectorAll(`input[type=checkbox][name^="${prefix}"]`).forEach(cb => {
    if (cb.checked) results.push(cb.value);
  });
  return results;
}

async function showCreateRoleModal() {
  let allPerms = [];
  try { allPerms = await Api.get('/admin/roles/permissions/'); } catch (_) {}

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:540px">
      <div class="modal-header">
        <h3 class="modal-title">Nouveau rôle</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-role-alert"></div>
      <form id="create-role-form">
        <div class="form-group"><label>Nom (identifiant) *</label><input name="name" required placeholder="mon_role"></div>
        <div class="form-group"><label>Label</label><input name="label" placeholder="Mon Rôle"></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        <div class="form-group">
          <label>Permissions</label>
          ${buildPermissionCheckboxes(allPerms, [], 'create-role-perms')}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const permission_names = getCheckedValues(e.target, 'perm_');
    try {
      await Api.post('/admin/roles/', {
        name: fd.get('name'),
        label: fd.get('label') || null,
        description: fd.get('description') || null,
        permission_names,
      });
      modal.remove();
      showToast('Rôle créé', 'success');
      loadRolesList();
    } catch (err) {
      showAlert('create-role-alert', err.message);
    }
  });
}

async function showEditRoleModal(roleId) {
  let role, allPerms;
  try {
    [allPerms] = await Promise.all([Api.get('/admin/roles/permissions/')]);
    const roles = await Api.get('/admin/roles/');
    role = roles.find(r => r.id === roleId);
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }
  if (!role) { showToast('Rôle introuvable', 'error'); return; }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:540px">
      <div class="modal-header">
        <h3 class="modal-title">Modifier le rôle <code>${role.name}</code></h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="edit-role-alert"></div>
      <form id="edit-role-form">
        <div class="form-group"><label>Label</label><input name="label" value="${role.label || ''}"></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2">${role.description || ''}</textarea></div>
        <div class="form-group">
          <label>Permissions</label>
          ${buildPermissionCheckboxes(allPerms, role.permissions, 'edit-role-perms')}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#edit-role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const permission_names = getCheckedValues(e.target, 'perm_');
    try {
      await Api.put(`/admin/roles/${roleId}`, {
        label: fd.get('label') || null,
        description: fd.get('description') || null,
        permission_names,
      });
      modal.remove();
      showToast('Rôle mis à jour', 'success');
      loadRolesList();
    } catch (err) {
      showAlert('edit-role-alert', err.message);
    }
  });
}

async function showCreateGroupModal() {
  let allRoles = [];
  try { allRoles = await Api.get('/admin/roles/'); } catch (_) {}

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h3 class="modal-title">Nouveau groupe</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-group-alert"></div>
      <form id="create-group-form">
        <div class="form-group"><label>Nom *</label><input name="name" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        <div class="form-group">
          <label>Rôles assignés</label>
          ${buildRoleCheckboxes(allRoles, [], 'create-group-roles')}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const role_names = getCheckedValues(e.target, 'role_');
    try {
      await Api.post('/admin/roles/groups/', {
        name: fd.get('name'),
        description: fd.get('description') || null,
        role_names,
      });
      modal.remove();
      showToast('Groupe créé', 'success');
      loadGroupsList();
    } catch (err) {
      showAlert('create-group-alert', err.message);
    }
  });
}

async function showEditGroupModal(groupId, groupName) {
  let allRoles, groups;
  try {
    [allRoles, groups] = await Promise.all([Api.get('/admin/roles/'), Api.get('/admin/roles/groups/')]);
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }
  const group = groups.find(g => g.id === groupId);
  if (!group) { showToast('Groupe introuvable', 'error'); return; }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h3 class="modal-title">Modifier le groupe <strong>${group.name}</strong></h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="edit-group-alert"></div>
      <form id="edit-group-form">
        <div class="form-group"><label>Description</label><textarea name="description" rows="2">${group.description || ''}</textarea></div>
        <div class="form-group">
          <label>Rôles assignés</label>
          ${buildRoleCheckboxes(allRoles, group.roles, 'edit-group-roles')}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#edit-group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const role_names = getCheckedValues(e.target, 'role_');
    try {
      await Api.put(`/admin/roles/groups/${groupId}`, {
        description: fd.get('description') || null,
        role_names,
      });
      modal.remove();
      showToast('Groupe mis à jour', 'success');
      loadGroupsList();
    } catch (err) {
      showAlert('edit-group-alert', err.message);
    }
  });
}

async function deleteRole(id, name) {
  if (!confirm(`Supprimer le rôle "${name}" ?`)) return;
  try {
    await Api.delete(`/admin/roles/${id}`);
    showToast('Rôle supprimé', 'success');
    loadRolesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteGroup(id, name) {
  if (!confirm(`Supprimer le groupe "${name}" ?`)) return;
  try {
    await Api.delete(`/admin/roles/groups/${id}`);
    showToast('Groupe supprimé', 'success');
    loadGroupsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
