// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Hôtes distants (Windows / Linux SSH)

registerTab('remote_hosts', (container) => loadRemoteHosts(container));

// ── Helpers ──────────────────────────────────────────────────────────────────

function _rhEscape(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _rhOsBadge(osType) {
  return osType === 'windows'
    ? '<span class="badge badge-info">🪟 Windows</span>'
    : '<span class="badge badge-success">🐧 Linux</span>';
}

// ── Chargement principal ─────────────────────────────────────────────────────

async function loadRemoteHosts(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      <!-- Andy Client download card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📦 Andy Client — Téléchargement</h3>
        </div>
        <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:1rem">
          <p style="font-size:0.85rem;color:var(--color-text-muted);line-height:1.6;margin:0">
            Installez <strong>Andy Client</strong> sur chaque poste Windows ou Linux à connecter.
            Il s'enregistre automatiquement via un token d'invitation et affiche l'état de la connexion
            dans la barre de notifications.
          </p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="downloadAndyClient()">
              🪟 Télécharger pour Windows (.exe)
            </button>
            <button class="btn btn-secondary" onclick="downloadAndyClient()">
              🐧 Télécharger pour Linux
            </button>
          </div>
          <div style="font-size:0.75rem;color:var(--color-text-muted);line-height:1.5">
            Le ZIP contient les sources Python + scripts de build PyInstaller.<br>
            Prérequis : Python 3.11+ — <code>pip install -r requirements.txt</code>
          </div>
        </div>
      </div>

      <!-- Invite token card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔑 Token d'invitation</h3>
        </div>
        <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:1rem">
          <p style="font-size:0.85rem;color:var(--color-text-muted);line-height:1.6;margin:0">
            Générez un token d'invitation <strong>à usage unique (24h)</strong> à coller dans Andy Client
            lors du premier lancement. Le client s'enregistre sans avoir besoin de vos identifiants admin.
          </p>
          <div>
            <button class="btn btn-primary btn-sm" onclick="generateRhInvite()">Générer un token d'invitation</button>
          </div>
          <div id="rh-invite-result" style="display:none"></div>
        </div>
      </div>

      <!-- Hosts list card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Hôtes distants (<span id="rh-count">—</span>)</h3>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-primary btn-sm" onclick="showCreateRhModal()">+ Ajouter un hôte</button>
            <button class="btn btn-secondary btn-sm" onclick="loadRemoteHosts(document.getElementById('tab-remote_hosts'))">Actualiser</button>
          </div>
        </div>
        <div id="rh-list">
          <div class="spinner" style="display:block;margin:2rem auto"></div>
        </div>
      </div>
    </div>`;

  await fetchRemoteHosts();
}

async function fetchRemoteHosts() {
  const list = document.getElementById('rh-list');
  const countEl = document.getElementById('rh-count');
  if (!list) return;

  try {
    const hosts = await Api.get('/admin/remote-hosts');
    if (countEl) countEl.textContent = hosts.length;

    if (hosts.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:2.5rem;color:var(--color-text-muted)">
          <p style="font-size:1.5rem;margin-bottom:0.5rem">🖥</p>
          <p>Aucun hôte distant configuré.</p>
          <p style="font-size:0.82rem;margin-top:0.5rem">Ajoutez un PC Windows ou Linux pour qu'Andy puisse y exécuter des commandes via SSH.</p>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width:3rem">#</th>
              <th>Nom</th>
              <th>Hôte / IP</th>
              <th style="width:7rem">OS</th>
              <th style="width:4rem">GPU</th>
              <th style="width:8rem">Utilisateur SSH</th>
              <th style="width:6rem">Clé SSH</th>
              <th style="width:7rem">Statut</th>
              <th style="width:10rem">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${hosts.map(h => `
              <tr>
                <td style="color:var(--color-text-muted);font-size:0.75rem">${h.id}</td>
                <td>
                  <div style="font-weight:500">${_rhEscape(h.name)}</div>
                  ${h.description ? `<div style="font-size:0.72rem;color:var(--color-text-muted)">${_rhEscape(h.description)}</div>` : ''}
                </td>
                <td style="font-family:monospace;font-size:0.82rem">${_rhEscape(h.host)}<span style="color:var(--color-text-muted)">:${h.port}</span></td>
                <td>${_rhOsBadge(h.os_type)}</td>
                <td style="text-align:center">${h.has_gpu ? '🎮' : '<span style="color:var(--color-text-muted);font-size:0.75rem">—</span>'}</td>
                <td style="font-family:monospace;font-size:0.8rem">${_rhEscape(h.ssh_user)}</td>
                <td>
                  ${h.has_ssh_key
                    ? '<span class="badge badge-success">✓ Configurée</span>'
                    : '<span class="badge badge-danger">⚠ Manquante</span>'}
                </td>
                <td>
                  ${h.is_active
                    ? '<span class="badge badge-success">Actif</span>'
                    : '<span class="badge badge-warning">Inactif</span>'}
                </td>
                <td>
                  <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm" onclick="testRhConnection(${h.id}, '${_rhEscape(h.name)}', '${h.os_type}')">Test</button>
                    <button class="btn btn-secondary btn-sm" onclick="showEditRhModal(${h.id})">Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRh(${h.id}, '${_rhEscape(h.name)}')">Suppr.</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:0.75rem 0.5rem">
        <div class="alert" style="background:var(--color-bg);border:1px solid var(--color-border);font-size:0.8rem;line-height:1.6">
          <strong>💡 Utilisation avec Andy :</strong>
          Dites à Andy <em>«&nbsp;Liste les hôtes distants&nbsp;»</em>, puis
          <em>«&nbsp;Exécute <code>Get-Process</code> sur thomas-pc&nbsp;»</em> ou
          <em>«&nbsp;Lis le fichier C:\\logs\\app.log sur thomas-pc&nbsp;»</em>.<br>
          Andy peut aussi créer des <strong>tâches récurrentes</strong> pour surveiller vos machines.
        </div>
      </div>`;
  } catch (err) {
    if (list) list.innerHTML = `<div class="alert alert-error" style="margin:0.75rem">Erreur: ${_rhEscape(err.message)}</div>`;
  }
}

// ── Téléchargement du client ─────────────────────────────────────────────────

async function downloadAndyClient() {
  const token = localStorage.getItem('access_token');
  if (!token) { showToast('Non authentifié — veuillez vous reconnecter.', 'error'); return; }
  const btn = event?.target?.closest('button');
  const origText = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Téléchargement…'; }
  try {
    const res = await fetch('/api/admin/remote-hosts/client/package', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'andy-client.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(`Erreur téléchargement : ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origText; }
  }
}

// ── Token d'invitation ────────────────────────────────────────────────────────

async function generateRhInvite() {
  const btn = event?.target?.closest('button');
  const resultEl = document.getElementById('rh-invite-result');
  if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }

  try {
    const res = await Api.post('/admin/remote-hosts/invite', {});
    const expires = new Date(res.expires_at).toLocaleString();

    resultEl.style.display = '';
    resultEl.innerHTML = `
      <div style="background:var(--color-bg-alt,var(--color-bg));border:1px solid var(--color-border);border-radius:0.5rem;padding:0.9rem;display:flex;flex-direction:column;gap:0.6rem">
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
          <code id="rh-invite-token" style="flex:1;font-size:0.8rem;word-break:break-all;background:var(--color-bg);padding:0.35rem 0.6rem;border-radius:0.35rem;border:1px solid var(--color-border)">${_rhEscape(res.token)}</code>
          <button class="btn btn-secondary btn-sm" onclick="_rhCopyToken()">Copier</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-text-muted)">
          ✅ Usage unique · Expire le <strong>${expires}</strong>
        </div>
        <div style="font-size:0.75rem;color:var(--color-text-muted);line-height:1.5;border-top:1px solid var(--color-border);padding-top:0.5rem">
          <strong>Comment l'utiliser :</strong><br>
          1. Lancez Andy Client sur le poste cible<br>
          2. Entrez l'URL du serveur Andy<br>
          3. Choisissez <em>«&nbsp;Token d'invitation&nbsp;»</em> et collez le token ci-dessus<br>
          4. L'hôte s'enregistre automatiquement — la clé SSH est générée et installée
        </div>
      </div>`;
  } catch (err) {
    resultEl.style.display = '';
    resultEl.innerHTML = `<div class="alert alert-error" style="font-size:0.82rem">Erreur : ${_rhEscape(err.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Générer un token d\'invitation'; }
  }
}

function _rhCopyToken() {
  const el = document.getElementById('rh-invite-token');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim()).then(
    () => showToast('Token copié dans le presse-papiers.', 'success'),
    () => showToast('Impossible de copier automatiquement.', 'warning'),
  );
}

// ── Test de connexion ────────────────────────────────────────────────────────

async function testRhConnection(id, name, osType) {
  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled = true; btn.textContent = 'Test…'; }

  try {
    const res = await Api.post(`/admin/remote-hosts/${id}/test`, {});
    if (res.ok) {
      showToast(`✓ ${name} — ${_rhEscape(res.os_version)} (${res.latency_ms}ms)`, 'success', 8000);
    } else {
      _showRhTestError(name, osType, res.os_version || 'La commande SSH a retourné un code d\'erreur.');
    }
  } catch (err) {
    _showRhTestError(name, osType, err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Test'; }
  }
}

function _showRhTestError(name, osType, detail) {
  const isWindows = osType === 'windows';
  const tips = isWindows ? `
    <strong>Windows — vérifications :</strong><br>
    • Service OpenSSH installé et démarré :<br>
    &nbsp;&nbsp;<code>Get-Service sshd</code> → doit être <em>Running</em><br>
    &nbsp;&nbsp;Sinon : <code>Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0</code><br>
    &nbsp;&nbsp;puis : <code>Start-Service sshd; Set-Service sshd -StartupType Automatic</code><br>
    • Pour l'utilisateur <strong>Administrator</strong>, le fichier authorized_keys est :<br>
    &nbsp;&nbsp;<code>C:\\ProgramData\\ssh\\administrators_authorized_keys</code><br>
    &nbsp;&nbsp;(pas <code>~\\.ssh\\authorized_keys</code>)<br>
    • Les ACL de ce fichier doivent être restreintes à System + Administrators :<br>
    &nbsp;&nbsp;<code>icacls C:\\ProgramData\\ssh\\administrators_authorized_keys /inheritance:r /grant "NT AUTHORITY\\SYSTEM:(F)" /grant "BUILTIN\\Administrators:(F)"</code><br>
    • Règle firewall port 22 : <code>Get-NetFirewallRule -Name sshd</code><br>
    • Réseau VPN (WireGuard) actif et tunnel joignable
  ` : `
    <strong>Linux — vérifications :</strong><br>
    • Clé publique dans <code>~/.ssh/authorized_keys</code> (permissions 600)<br>
    • Utilisateur SSH correct et service <code>sshd</code> démarré<br>
    • Firewall : port 22 ouvert (<code>ufw allow 22</code> ou <code>iptables</code>)<br>
    • Machine joignable sur le réseau (ping, VPN/WireGuard actif)
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;width:95%">
      <div class="modal-header">
        <h3 class="modal-title">⚠ Échec de connexion — ${isWindows ? '🪟 Windows' : '🐧 Linux'}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem">
        <div style="font-size:0.85rem;color:var(--color-text-muted)">Hôte : <strong>${_rhEscape(name)}</strong></div>
        <div class="alert alert-error" style="font-family:monospace;font-size:0.8rem;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow-y:auto">${_rhEscape(detail)}</div>
        <div style="font-size:0.79rem;color:var(--color-text-muted);line-height:1.8;border-top:1px solid var(--color-border);padding-top:0.75rem">${tips}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
      </div>
    </div>`;
  document.getElementById('modal-container').appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ── Supprimer ────────────────────────────────────────────────────────────────

async function deleteRh(id, name) {
  if (!confirm(`Supprimer l'hôte distant "${name}" ?\n\nAndy ne pourra plus y accéder.`)) return;
  try {
    await Api.delete(`/admin/remote-hosts/${id}`);
    showToast(`Hôte "${name}" supprimé.`, 'success');
    fetchRemoteHosts();
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

// ── Modal création ───────────────────────────────────────────────────────────

function showCreateRhModal() {
  _showRhModal(null);
}

async function showEditRhModal(id) {
  try {
    const host = await Api.get(`/admin/remote-hosts/${id}`);
    _showRhModal(host);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

function _showRhModal(host) {
  const isEdit = !!host;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;width:95%">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Modifier' : 'Ajouter'} un hôte distant</h3>
        <button class="modal-close" id="rh-modal-close">&times;</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem">

        <div style="display:flex;gap:1rem">
          <div class="form-group" style="flex:1">
            <label class="form-label">Nom <span style="color:var(--color-danger)">*</span></label>
            <input class="form-input" id="rh-name" type="text" placeholder="thomas-pc" maxlength="200" value="${isEdit ? _rhEscape(host.name) : ''}" autocomplete="off">
          </div>
          <div class="form-group" style="width:120px">
            <label class="form-label">Type OS <span style="color:var(--color-danger)">*</span></label>
            <select class="form-input" id="rh-os">
              <option value="windows" ${(!isEdit || host.os_type === 'windows') ? 'selected' : ''}>🪟 Windows</option>
              <option value="linux" ${(isEdit && host.os_type === 'linux') ? 'selected' : ''}>🐧 Linux</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:1rem">
          <div class="form-group" style="flex:1">
            <label class="form-label">IP / Hostname <span style="color:var(--color-danger)">*</span></label>
            <input class="form-input" id="rh-host" type="text" placeholder="10.0.0.50" value="${isEdit ? _rhEscape(host.host) : ''}" autocomplete="off">
          </div>
          <div class="form-group" style="width:100px">
            <label class="form-label">Port SSH</label>
            <input class="form-input" id="rh-port" type="number" min="1" max="65535" value="${isEdit ? host.port : 22}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Utilisateur SSH <span style="color:var(--color-danger)">*</span></label>
          <input class="form-input" id="rh-user" type="text" placeholder="administrator" value="${isEdit ? _rhEscape(host.ssh_user) : 'administrator'}" autocomplete="off">
          <div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.25rem">Windows: administrator ou votre compte Windows. Linux: votre user ou root.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Clé SSH privée (PEM) ${isEdit ? '<span style="color:var(--color-text-muted);font-size:0.75rem">— laisser vide pour conserver l\'actuelle</span>' : '<span style="color:var(--color-danger)">*</span>'}</label>
          <textarea class="form-input" id="rh-key" rows="5" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----" style="font-family:monospace;font-size:0.75rem;resize:vertical"></textarea>
          <div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.25rem">La clé est chiffrée AES-256 avant stockage. Jamais exposée via l'API.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <input class="form-input" id="rh-desc" type="text" placeholder="PC de Thomas — WireGuard" value="${isEdit ? _rhEscape(host.description || '') : ''}" maxlength="300">
        </div>

        <div style="display:flex;gap:2rem;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <label class="toggle">
              <input type="checkbox" id="rh-active" ${(!isEdit || host.is_active) ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size:0.85rem">Actif</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <label class="toggle">
              <input type="checkbox" id="rh-gpu" ${(isEdit && host.has_gpu) ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size:0.85rem">🎮 GPU disponible</span>
          </div>
        </div>

        <div id="rh-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="rh-submit">${isEdit ? 'Enregistrer' : 'Ajouter l\'hôte'}</button>
        <button class="btn btn-secondary" id="rh-cancel">Annuler</button>
      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#rh-modal-close').addEventListener('click', close);
  modal.querySelector('#rh-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelector('#rh-submit').addEventListener('click', async () => {
    const name = modal.querySelector('#rh-name').value.trim();
    const host_val = modal.querySelector('#rh-host').value.trim();
    const port = parseInt(modal.querySelector('#rh-port').value) || 22;
    const ssh_user = modal.querySelector('#rh-user').value.trim();
    const ssh_key = modal.querySelector('#rh-key').value.trim();
    const os_type = modal.querySelector('#rh-os').value;
    const description = modal.querySelector('#rh-desc').value.trim() || null;
    const is_active = modal.querySelector('#rh-active').checked;
    const has_gpu = modal.querySelector('#rh-gpu').checked;
    const errEl = modal.querySelector('#rh-error');
    const btn = modal.querySelector('#rh-submit');

    if (!name || !host_val || !ssh_user) {
      errEl.textContent = 'Nom, IP et utilisateur SSH sont obligatoires.';
      errEl.style.display = '';
      return;
    }
    if (!isEdit && !ssh_key) {
      errEl.textContent = 'La clé SSH est obligatoire pour un nouvel hôte.';
      errEl.style.display = '';
      return;
    }

    btn.disabled = true;
    btn.textContent = isEdit ? 'Enregistrement…' : 'Ajout…';
    errEl.style.display = 'none';

    const payload = { name, host: host_val, port, ssh_user, os_type, has_gpu, description, is_active };
    if (ssh_key) payload.ssh_key = ssh_key;

    try {
      if (isEdit) {
        await Api.put(`/admin/remote-hosts/${host.id}`, payload);
        showToast(`Hôte "${name}" mis à jour.`, 'success');
      } else {
        await Api.post('/admin/remote-hosts', payload);
        showToast(`Hôte "${name}" ajouté. Andy peut maintenant y accéder.`, 'success');
      }
      close();
      fetchRemoteHosts();
    } catch (err) {
      errEl.textContent = 'Erreur: ' + err.message;
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = isEdit ? 'Enregistrer' : 'Ajouter l\'hôte';
    }
  });

  setTimeout(() => modal.querySelector('#rh-name')?.focus(), 50);
}
