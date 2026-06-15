// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// LLMUI Entreprise v4.3 — /zadmin Paramètres tab

'use strict';

registerTab('config', (container) => loadConfig(container));

const CONFIG_SECTIONS = [
  {
    id: 'general',
    label: 'Général',
    icon: '⚙️',
    keys: [
      { key: 'app_name',           label: 'Nom de l\'application',  type: 'string' },
      { key: 'app_url',            label: 'URL de l\'application',   type: 'string' },
      { key: 'default_lang',       label: 'Langue par défaut',       type: 'string' },
      { key: 'timezone',           label: 'Fuseau horaire',          type: 'string' },
      { key: 'maintenance_mode',   label: 'Mode maintenance',        type: 'bool' },
      { key: 'maintenance_message',label: 'Message maintenance',     type: 'string' },
    ],
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: '🔒',
    keys: [
      { key: 'jwt_access_ttl_min',      label: 'TTL token accès (min)',      type: 'int' },
      { key: 'jwt_refresh_ttl_days',    label: 'TTL token refresh (jours)',  type: 'int' },
      { key: 'max_login_attempts',      label: 'Tentatives max login',       type: 'int' },
      { key: 'lockout_duration_min',    label: 'Blocage login (min)',         type: 'int' },
      { key: 'totp_required_admins',    label: 'TOTP requis admins',         type: 'bool' },
      { key: 'totp_required_all',       label: 'TOTP requis tous',           type: 'bool' },
      { key: 'session_idle_timeout_min',label: 'Timeout session inactif (min)',type: 'int' },
      { key: 'cors_whitelist',          label: 'Liste blanche CORS (JSON)',   type: 'json' },
      { key: 'zadmin_ip_whitelist',     label: 'IP whitelist /zadmin (JSON)', type: 'json' },
    ],
  },
  {
    id: 'smtp',
    label: 'Email / SMTP',
    icon: '📧',
    keys: [
      { key: 'host',         label: 'Serveur SMTP',      type: 'string' },
      { key: 'port',         label: 'Port',              type: 'int' },
      { key: 'use_tls',      label: 'Utiliser TLS',      type: 'bool' },
      { key: 'username',     label: 'Nom d\'utilisateur',type: 'string' },
      { key: 'password',     label: 'Mot de passe',      type: 'secret' },
      { key: 'from_address', label: 'Adresse expéditeur',type: 'string' },
      { key: 'from_name',    label: 'Nom expéditeur',    type: 'string' },
    ],
    extra: '<button class="btn btn-secondary" onclick="testSmtp()">Tester SMTP</button>',
  },
  {
    id: 'andy',
    label: 'Andy AI',
    icon: '🤖',
    keys: [
      { key: 'enabled',              label: 'Activer Andy',                      type: 'bool' },
      { key: 'ollama_url',           label: 'URL Ollama',                        type: 'string' },
      { key: 'ollama_port',          label: 'Port Ollama',                       type: 'int' },
      { key: 'default_model',        label: 'Modèle par défaut',                 type: 'string' },
      { key: 'system_prompt',        label: 'Prompt système',                    type: 'text' },
      { key: 'max_history_messages', label: 'Max messages historique',           type: 'int' },
      { key: 'heartbeat_enabled',    label: 'Heartbeat (tâches de fond)',        type: 'bool' },
      { key: 'heartbeat_interval',   label: 'Intervalle heartbeat (s)',          type: 'int' },
      { key: 'idle_resume_delay',    label: 'Délai reprise inactivité (s)',      type: 'int' },
    ],
  },
  {
    id: 'webcrawler',
    label: 'Webcrawler',
    icon: '🕷️',
    keys: [
      { key: 'url',     label: 'URL du serveur (ex: http://10.0.3.127)', type: 'string' },
      { key: 'api_key', label: 'Clé API (X-API-Key)',                    type: 'secret' },
    ],
  },
  {
    id: 'backup',
    label: 'Sauvegarde',
    icon: '💾',
    keys: [
      { key: 'enabled',        label: 'Sauvegarde activée',      type: 'bool' },
      { key: 'schedule_cron',  label: 'Planification (cron)',    type: 'string' },
      { key: 'retention_days', label: 'Rétention (jours)',       type: 'int' },
      { key: 'gpg_recipient',  label: 'Destinataire GPG',        type: 'string' },
    ],
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: '📋',
    keys: [
      { key: 'retention_days', label: 'Rétention logs audit (jours)', type: 'int' },
    ],
  },
  {
    id: 'proxmox',
    label: 'Proxmox',
    icon: '🖥️',
    keys: [],
    customRender: true,
  },
  {
    id: 'pbs',
    label: 'PBS',
    icon: '💾',
    keys: [],
    customRender: true,
  },
  {
    id: 'i18n',
    label: 'Internationalisation',
    icon: '🌐',
    keys: [
      { key: 'active_langs', label: 'Langues actives (JSON)', type: 'json' },
      { key: 'rtl_langs',    label: 'Langues RTL (JSON)',     type: 'json' },
    ],
  },
];

let _configData = {};

async function loadConfig(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Paramètres système</h2>
      <p class="text-muted">Configuration stockée dans la base de données (system_config). Les valeurs sensibles sont chiffrées AES-256.</p>
    </div>
    <div id="config-alert"></div>
    <div id="config-sections-nav" class="config-nav"></div>
    <div id="config-sections-content"></div>
  `;

  await fetchAllConfig(container);
}

async function fetchAllConfig(container) {
  try {
    const data = await Api.get('/admin/config/');
    // Transform [{section, items:[{key,value}]}] → {section: {key: value}}
    _configData = {};
    for (const sec of data) {
      _configData[sec.section] = {};
      for (const item of sec.items) {
        _configData[sec.section][item.key] = item.value;
      }
    }
    renderConfigNav(container);
    renderConfigSection(CONFIG_SECTIONS[0].id, container);
  } catch (err) {
    showAlert('config-alert', 'Erreur de chargement de la configuration: ' + err.message, 'error');
  }
}

function renderConfigNav(container) {
  const nav = container.querySelector('#config-sections-nav');
  nav.innerHTML = CONFIG_SECTIONS.map((sec, idx) => `
    <button class="config-nav-btn ${idx === 0 ? 'active' : ''}"
            data-section="${sec.id}"
            onclick="renderConfigSection('${sec.id}', document.getElementById('tab-config'))">
      <span>${sec.icon}</span> ${sec.label}
    </button>
  `).join('');
}

function renderConfigSection(sectionId, container) {
  // Update active nav button
  container.querySelectorAll('.config-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });

  const sec = CONFIG_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return;

  if (sec.customRender) {
    const content = container.querySelector('#config-sections-content');
    if (sectionId === 'proxmox') renderProxmoxServersSection(content);
    if (sectionId === 'pbs') renderPbsServersSection(content);
    return;
  }

  const sectionData = _configData[sectionId] || {};
  const content = container.querySelector('#config-sections-content');

  content.innerHTML = `
    <div class="config-section-card card">
      <div class="card-header">
        <h3>${sec.icon} ${sec.label}</h3>
      </div>
      <div class="card-body">
        <div id="config-section-alert-${sectionId}"></div>
        <form id="config-form-${sectionId}" onsubmit="saveConfigSection(event, '${sectionId}')">
          ${sec.keys.map(field => renderConfigField(field, sectionData[field.key])).join('')}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Enregistrer</button>
            ${sec.extra || ''}
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderConfigField(field, value) {
  const displayValue = (value === null || value === undefined) ? '' : value;

  if (field.type === 'bool') {
    const checked = (displayValue === true || displayValue === 'true') ? 'checked' : '';
    return `
      <div class="form-group form-group-toggle">
        <label for="cfg-${field.key}">${field.label}</label>
        <label class="toggle">
          <input type="checkbox" id="cfg-${field.key}" name="${field.key}" ${checked}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  if (field.type === 'text') {
    return `
      <div class="form-group">
        <label for="cfg-${field.key}">${field.label}</label>
        <textarea id="cfg-${field.key}" name="${field.key}" rows="4" class="form-control">${displayValue}</textarea>
      </div>
    `;
  }

  if (field.type === 'secret') {
    const isMasked = typeof displayValue === 'string' && displayValue.startsWith('••');
    return `
      <div class="form-group">
        <label for="cfg-${field.key}">${field.label} <span class="badge badge-warning">Chiffré</span></label>
        <div class="input-group">
          <input type="password" id="cfg-${field.key}" name="${field.key}"
                 class="form-control"
                 placeholder="${isMasked ? 'Laisser vide pour conserver la valeur' : ''}"
                 value="${isMasked ? '' : displayValue}">
          <button type="button" class="btn btn-secondary" onclick="togglePasswordVisibility('cfg-${field.key}')">👁</button>
        </div>
        ${isMasked ? '<small class="text-muted">Valeur chiffrée en place. Laissez vide pour ne pas modifier.</small>' : ''}
      </div>
    `;
  }

  if (field.type === 'json') {
    let jsonStr = displayValue;
    if (typeof jsonStr === 'object') {
      jsonStr = JSON.stringify(jsonStr, null, 2);
    }
    return `
      <div class="form-group">
        <label for="cfg-${field.key}">${field.label} <span class="badge badge-info">JSON</span></label>
        <textarea id="cfg-${field.key}" name="${field.key}" rows="3" class="form-control font-mono">${jsonStr}</textarea>
      </div>
    `;
  }

  // string or int
  return `
    <div class="form-group">
      <label for="cfg-${field.key}">${field.label}</label>
      <input type="${field.type === 'int' ? 'number' : 'text'}"
             id="cfg-${field.key}" name="${field.key}"
             class="form-control"
             value="${displayValue}">
    </div>
  `;
}

async function saveConfigSection(event, sectionId) {
  event.preventDefault();
  const alertId = `config-section-alert-${sectionId}`;
  const form = event.target;
  const sec = CONFIG_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return;

  clearAlert(alertId);

  const updates = [];
  for (const field of sec.keys) {
    const el = form.querySelector(`#cfg-${field.key}`);
    if (!el) continue;

    let value;
    if (field.type === 'bool') {
      value = String(el.checked); // "true" or "false"
    } else if (field.type === 'secret') {
      // Skip empty secret fields (keep existing value)
      if (!el.value.trim()) continue;
      value = el.value;
    } else if (field.type === 'json') {
      try {
        JSON.parse(el.value); // validate only
        value = el.value.trim(); // send as string
      } catch {
        showAlert(alertId, `JSON invalide pour le champ "${field.label}"`, 'error');
        return;
      }
    } else if (field.type === 'int') {
      value = String(parseInt(el.value, 10)); // "15"
    } else {
      value = el.value;
    }

    updates.push({ key: field.key, value });
  }

  try {
    setLoading(form.querySelector('button[type=submit]'), true);
    for (const update of updates) {
      await Api.put(`/admin/config/${sectionId}/${update.key}`, { value: update.value });
    }
    showAlert(alertId, 'Configuration enregistrée.', 'success');
    // Refresh cached data — transform [{key,value}] → {key: value}
    const refreshed = await Api.get(`/admin/config/${sectionId}`);
    _configData[sectionId] = {};
    for (const item of refreshed) {
      _configData[sectionId][item.key] = item.value;
    }
  } catch (err) {
    showAlert(alertId, 'Erreur lors de la sauvegarde: ' + err.message, 'error');
  } finally {
    setLoading(form.querySelector('button[type=submit]'), false);
  }
}

async function testSmtp() {
  const alertId = 'config-section-alert-smtp';
  clearAlert(alertId);
  try {
    await Api.post('/admin/config/smtp/test', {});
    showAlert(alertId, 'Test SMTP réussi — email envoyé.', 'success');
  } catch (err) {
    showAlert(alertId, 'Test SMTP échoué: ' + err.message, 'error');
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ── Gestion des serveurs Proxmox ─────────────────────────────────────────────

let _cfgProxmoxServers = [];
let _proxmoxEditingId = null;

function renderProxmoxServersSection(content) {
  content.innerHTML = `
    <div class="config-section-card card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>🖥️ Proxmox — Serveurs SSH</h3>
        <button class="btn btn-primary btn-sm" onclick="showProxmoxServerForm()">+ Ajouter un serveur</button>
      </div>
      <div class="card-body">
        <div id="proxmox-servers-alert"></div>
        <div id="proxmox-servers-table"><div class="spinner"></div></div>
        <div id="proxmox-server-form-wrap" style="display:none">
          <hr>
          <h4 id="proxmox-form-title" style="margin-bottom:1rem">Ajouter un serveur</h4>
          <form id="proxmox-server-form" onsubmit="saveProxmoxServer(event)">
            <input type="hidden" id="prx-srv-id">
            <div class="form-group">
              <label for="prx-srv-name">Nom *</label>
              <input type="text" id="prx-srv-name" class="form-control" required placeholder="Proxmox-01">
            </div>
            <div class="form-group">
              <label for="prx-srv-ip">Adresse IP / Hostname *</label>
              <input type="text" id="prx-srv-ip" class="form-control" required placeholder="192.168.1.100">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group">
                <label for="prx-srv-user">Utilisateur SSH</label>
                <input type="text" id="prx-srv-user" class="form-control" value="root">
              </div>
              <div class="form-group">
                <label for="prx-srv-port">Port SSH</label>
                <input type="number" id="prx-srv-port" class="form-control" value="22" min="1" max="65535">
              </div>
            </div>
            <div class="form-group">
              <label for="prx-srv-key">
                Clé SSH privée <span class="badge badge-warning">Chiffré AES-256</span>
                <span id="prx-key-hint" class="text-muted" style="font-size:0.82em;margin-left:0.4rem"></span>
              </label>
              <textarea id="prx-srv-key" class="form-control font-mono" rows="7"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"></textarea>
            </div>
            <div class="form-group">
              <label for="prx-srv-desc">Description</label>
              <input type="text" id="prx-srv-desc" class="form-control" placeholder="Optionnel">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group form-group-toggle">
                <label for="prx-srv-active">Actif</label>
                <label class="toggle">
                  <input type="checkbox" id="prx-srv-active" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="form-group form-group-toggle">
                <label for="prx-srv-production">Production</label>
                <label class="toggle">
                  <input type="checkbox" id="prx-srv-production">
                  <span class="toggle-slider"></span>
                </label>
                <small class="text-muted" style="display:block;margin-top:0.25rem">⚠️ Suppression VM/LXC désactivée en prod</small>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="prx-srv-save-btn">Enregistrer</button>
              <button type="button" class="btn btn-secondary" onclick="cancelProxmoxServerForm()">Annuler</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  loadProxmoxServers();
}

async function loadProxmoxServers() {
  const tableEl = document.getElementById('proxmox-servers-table');
  if (!tableEl) return;

  try {
    _cfgProxmoxServers = await Api.get('/admin/proxmox/servers');

    if (_cfgProxmoxServers.length === 0) {
      tableEl.innerHTML = `
        <div class="empty-state" style="padding:2rem;text-align:center">
          <p class="text-muted">Aucun serveur configuré.</p>
          <p class="text-muted">Cliquez sur <strong>+ Ajouter un serveur</strong> pour commencer.</p>
        </div>
      `;
      return;
    }

    tableEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Adresse IP</th>
            <th>SSH</th>
            <th>Clé</th>
            <th>Statut</th>
            <th>Environnement</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_cfgProxmoxServers.map(srv => `
            <tr>
              <td><strong>${escapeHtmlCfg(srv.name)}</strong>
                ${srv.description ? `<br><small class="text-muted">${escapeHtmlCfg(srv.description)}</small>` : ''}
              </td>
              <td><code>${escapeHtmlCfg(srv.ip_address)}</code></td>
              <td><small>${escapeHtmlCfg(srv.ssh_user)}:${srv.ssh_port}</small></td>
              <td>
                ${srv.has_ssh_key
                  ? '<span class="badge badge-success">✓ Configurée</span>'
                  : '<span class="badge badge-warning">Manquante</span>'}
              </td>
              <td>
                <span class="badge badge-${srv.is_active ? 'success' : 'error'}">
                  ${srv.is_active ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td>
                <span class="badge badge-${srv.is_production ? 'error' : 'info'}" title="${srv.is_production ? 'Serveur de production — suppression VM/LXC désactivée' : 'Serveur de test'}">
                  ${srv.is_production ? '🔴 Production' : '🟢 Test'}
                </span>
              </td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="showProxmoxServerForm(${srv.id})">Modifier</button>
                <button class="btn btn-sm" style="background:var(--color-error,#e53e3e);color:#fff;margin-left:0.25rem"
                        onclick="deleteProxmoxServer(${srv.id}, '${escapeHtmlCfg(srv.name)}')">Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    tableEl.innerHTML = `<div class="alert alert-error">Erreur de chargement: ${err.message}</div>`;
  }
}

function showProxmoxServerForm(serverId = null) {
  const wrap = document.getElementById('proxmox-server-form-wrap');
  const title = document.getElementById('proxmox-form-title');
  const hint = document.getElementById('prx-key-hint');
  if (!wrap) return;

  _proxmoxEditingId = serverId;

  document.getElementById('prx-srv-id').value = serverId || '';
  document.getElementById('prx-srv-name').value = '';
  document.getElementById('prx-srv-ip').value = '';
  document.getElementById('prx-srv-user').value = 'root';
  document.getElementById('prx-srv-port').value = '22';
  document.getElementById('prx-srv-key').value = '';
  document.getElementById('prx-srv-desc').value = '';
  document.getElementById('prx-srv-active').checked = true;
  document.getElementById('prx-srv-production').checked = false;

  if (serverId) {
    const srv = _cfgProxmoxServers.find(s => s.id === serverId);
    if (srv) {
      title.textContent = 'Modifier le serveur';
      document.getElementById('prx-srv-name').value = srv.name;
      document.getElementById('prx-srv-ip').value = srv.ip_address;
      document.getElementById('prx-srv-user').value = srv.ssh_user;
      document.getElementById('prx-srv-port').value = srv.ssh_port;
      document.getElementById('prx-srv-desc').value = srv.description || '';
      document.getElementById('prx-srv-active').checked = srv.is_active;
      document.getElementById('prx-srv-production').checked = srv.is_production;
      hint.textContent = srv.has_ssh_key ? '(laisser vide pour conserver la clé existante)' : '';
      const keyField = document.getElementById('prx-srv-key');
      keyField.required = false;
      keyField.placeholder = srv.has_ssh_key
        ? 'Laisser vide pour conserver la clé existante'
        : '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----';
    }
  } else {
    title.textContent = 'Ajouter un serveur';
    hint.textContent = '';
    document.getElementById('prx-srv-key').required = true;
    document.getElementById('prx-srv-key').placeholder =
      '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----';
  }

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelProxmoxServerForm() {
  const wrap = document.getElementById('proxmox-server-form-wrap');
  if (wrap) wrap.style.display = 'none';
  _proxmoxEditingId = null;
}

async function saveProxmoxServer(event) {
  event.preventDefault();
  clearAlert('proxmox-servers-alert');

  const name = document.getElementById('prx-srv-name').value.trim();
  const ip_address = document.getElementById('prx-srv-ip').value.trim();
  const ssh_user = document.getElementById('prx-srv-user').value.trim() || 'root';
  const ssh_port = parseInt(document.getElementById('prx-srv-port').value, 10) || 22;
  const ssh_key = document.getElementById('prx-srv-key').value.trim();
  const description = document.getElementById('prx-srv-desc').value.trim() || null;
  const is_active = document.getElementById('prx-srv-active').checked;
  const is_production = document.getElementById('prx-srv-production').checked;

  const btn = document.getElementById('prx-srv-save-btn');
  setLoading(btn, true);

  try {
    const payload = { name, ip_address, ssh_user, ssh_port, description, is_active, is_production };
    if (ssh_key) payload.ssh_key = ssh_key;

    if (_proxmoxEditingId) {
      await Api.put(`/admin/proxmox/servers/${_proxmoxEditingId}`, payload);
      showAlert('proxmox-servers-alert', 'Serveur mis à jour.', 'success');
    } else {
      if (!ssh_key) {
        showAlert('proxmox-servers-alert', 'La clé SSH est requise pour un nouveau serveur.', 'error');
        return;
      }
      await Api.post('/admin/proxmox/servers', payload);
      showAlert('proxmox-servers-alert', 'Serveur ajouté.', 'success');
    }

    cancelProxmoxServerForm();
    await loadProxmoxServers();
  } catch (err) {
    showAlert('proxmox-servers-alert', 'Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function deleteProxmoxServer(id, name) {
  if (!confirm(`Supprimer le serveur "${name}" ?`)) return;
  clearAlert('proxmox-servers-alert');
  try {
    await Api.delete(`/admin/proxmox/servers/${id}`);
    showAlert('proxmox-servers-alert', `Serveur "${name}" supprimé.`, 'success');
    await loadProxmoxServers();
  } catch (err) {
    showAlert('proxmox-servers-alert', 'Erreur: ' + err.message, 'error');
  }
}

// ── Gestion des serveurs PBS (Proxmox Backup Server) ──────────────────────────

let _pbsServers = [];
let _pbsEditingId = null;

function renderPbsServersSection(content) {
  content.innerHTML = `
    <div class="config-section-card card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>💾 PBS — Proxmox Backup Server</h3>
        <button class="btn btn-primary btn-sm" onclick="showPbsServerForm()">+ Ajouter un serveur</button>
      </div>
      <div class="card-body">
        <div id="pbs-servers-alert"></div>
        <div id="pbs-servers-table"><div class="spinner"></div></div>
        <div id="pbs-server-form-wrap" style="display:none">
          <hr>
          <h4 id="pbs-form-title" style="margin-bottom:1rem">Ajouter un serveur PBS</h4>
          <form id="pbs-server-form" onsubmit="savePbsServer(event)">
            <input type="hidden" id="pbs-srv-id">
            <div class="form-group">
              <label for="pbs-srv-name">Nom *</label>
              <input type="text" id="pbs-srv-name" class="form-control" required placeholder="PBS-01">
            </div>
            <div class="form-group">
              <label for="pbs-srv-ip">Adresse IP / Hostname *</label>
              <input type="text" id="pbs-srv-ip" class="form-control" required placeholder="192.168.1.200">
            </div>
            <div class="form-group">
              <label for="pbs-srv-port">Port API</label>
              <input type="number" id="pbs-srv-port" class="form-control" value="8007" min="1" max="65535">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group">
                <label for="pbs-srv-username">Utilisateur (ex: root@pam)</label>
                <input type="text" id="pbs-srv-username" class="form-control" value="root@pam" placeholder="root@pam">
              </div>
              <div class="form-group">
                <label for="pbs-srv-token-id">Token ID (ex: andy)</label>
                <input type="text" id="pbs-srv-token-id" class="form-control" placeholder="andy">
              </div>
            </div>
            <div class="form-group">
              <label for="pbs-srv-credential">
                Token secret <span class="badge badge-warning">Chiffré AES-256</span>
                <span id="pbs-cred-hint" class="text-muted" style="font-size:0.82em;margin-left:0.4rem"></span>
              </label>
              <input type="password" id="pbs-srv-credential" class="form-control"
                placeholder="Collez le secret du token API PBS ici">
            </div>
            <div class="form-group">
              <label for="pbs-srv-fingerprint">Empreinte TLS (fingerprint SHA-256, optionnel)</label>
              <input type="text" id="pbs-srv-fingerprint" class="form-control font-mono"
                placeholder="xx:xx:xx:... (laissez vide pour ignorer la vérification TLS)">
            </div>
            <div class="form-group">
              <label for="pbs-srv-desc">Description</label>
              <input type="text" id="pbs-srv-desc" class="form-control" placeholder="Optionnel">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div class="form-group form-group-toggle">
                <label for="pbs-srv-active">Actif</label>
                <label class="toggle">
                  <input type="checkbox" id="pbs-srv-active" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="form-group form-group-toggle">
                <label for="pbs-srv-production">Production</label>
                <label class="toggle">
                  <input type="checkbox" id="pbs-srv-production">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="pbs-srv-save-btn">Enregistrer</button>
              <button type="button" class="btn btn-secondary" onclick="cancelPbsServerForm()">Annuler</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  loadPbsServers();
}

async function loadPbsServers() {
  const tableEl = document.getElementById('pbs-servers-table');
  if (!tableEl) return;

  try {
    _pbsServers = await Api.get('/admin/pbs/servers');

    if (_pbsServers.length === 0) {
      tableEl.innerHTML = `
        <div class="empty-state" style="padding:2rem;text-align:center">
          <p class="text-muted">Aucun serveur PBS configuré.</p>
          <p class="text-muted">Cliquez sur <strong>+ Ajouter un serveur</strong> pour commencer.</p>
          <p class="text-muted" style="font-size:0.85em;margin-top:1rem">
            Le token PBS se crée dans l'interface PBS : Datacenter → Permissions → API Tokens.
          </p>
        </div>
      `;
      return;
    }

    tableEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Adresse</th>
            <th>Authentification</th>
            <th>Token</th>
            <th>Statut</th>
            <th>Environnement</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_pbsServers.map(srv => `
            <tr>
              <td><strong>${escapeHtmlCfg(srv.name)}</strong>
                ${srv.description ? `<br><small class="text-muted">${escapeHtmlCfg(srv.description)}</small>` : ''}
              </td>
              <td><code>${escapeHtmlCfg(srv.ip_address)}:${srv.port}</code></td>
              <td><small>${escapeHtmlCfg(srv.username)}!${escapeHtmlCfg(srv.token_id)}</small></td>
              <td>
                ${srv.has_credential
                  ? '<span class="badge badge-success">✓ Configuré</span>'
                  : '<span class="badge badge-warning">Manquant</span>'}
              </td>
              <td>
                <span class="badge badge-${srv.is_active ? 'success' : 'error'}">
                  ${srv.is_active ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td>
                <span class="badge badge-${srv.is_production ? 'error' : 'info'}">
                  ${srv.is_production ? '🔴 Production' : '🟢 Test'}
                </span>
              </td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="showPbsServerForm(${srv.id})">Modifier</button>
                <button class="btn btn-sm" style="background:var(--color-error,#e53e3e);color:#fff;margin-left:0.25rem"
                        onclick="deletePbsServer(${srv.id}, '${escapeHtmlCfg(srv.name)}')">Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    tableEl.innerHTML = `<div class="alert alert-error">Erreur de chargement: ${err.message}</div>`;
  }
}

function showPbsServerForm(serverId = null) {
  const wrap = document.getElementById('pbs-server-form-wrap');
  const title = document.getElementById('pbs-form-title');
  const hint = document.getElementById('pbs-cred-hint');
  if (!wrap) return;

  _pbsEditingId = serverId;

  document.getElementById('pbs-srv-id').value = serverId || '';
  document.getElementById('pbs-srv-name').value = '';
  document.getElementById('pbs-srv-ip').value = '';
  document.getElementById('pbs-srv-port').value = '8007';
  document.getElementById('pbs-srv-username').value = 'root@pam';
  document.getElementById('pbs-srv-token-id').value = '';
  document.getElementById('pbs-srv-credential').value = '';
  document.getElementById('pbs-srv-fingerprint').value = '';
  document.getElementById('pbs-srv-desc').value = '';
  document.getElementById('pbs-srv-active').checked = true;
  document.getElementById('pbs-srv-production').checked = false;

  const credField = document.getElementById('pbs-srv-credential');

  if (serverId) {
    const srv = _pbsServers.find(s => s.id === serverId);
    if (srv) {
      title.textContent = 'Modifier le serveur PBS';
      document.getElementById('pbs-srv-name').value = srv.name;
      document.getElementById('pbs-srv-ip').value = srv.ip_address;
      document.getElementById('pbs-srv-port').value = srv.port;
      document.getElementById('pbs-srv-username').value = srv.username;
      document.getElementById('pbs-srv-token-id').value = srv.token_id;
      document.getElementById('pbs-srv-fingerprint').value = srv.fingerprint || '';
      document.getElementById('pbs-srv-desc').value = srv.description || '';
      document.getElementById('pbs-srv-active').checked = srv.is_active;
      document.getElementById('pbs-srv-production').checked = srv.is_production;
      hint.textContent = srv.has_credential ? '(laisser vide pour conserver le token existant)' : '';
      credField.required = false;
      credField.placeholder = srv.has_credential
        ? 'Laisser vide pour conserver le token existant'
        : 'Collez le secret du token API PBS ici';
    }
  } else {
    title.textContent = 'Ajouter un serveur PBS';
    hint.textContent = '';
    credField.required = true;
    credField.placeholder = 'Collez le secret du token API PBS ici';
  }

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelPbsServerForm() {
  const wrap = document.getElementById('pbs-server-form-wrap');
  if (wrap) wrap.style.display = 'none';
  _pbsEditingId = null;
}

async function savePbsServer(event) {
  event.preventDefault();
  clearAlert('pbs-servers-alert');

  const name = document.getElementById('pbs-srv-name').value.trim();
  const ip_address = document.getElementById('pbs-srv-ip').value.trim();
  const port = parseInt(document.getElementById('pbs-srv-port').value, 10) || 8007;
  const username = document.getElementById('pbs-srv-username').value.trim() || 'root@pam';
  const token_id = document.getElementById('pbs-srv-token-id').value.trim();
  const credential = document.getElementById('pbs-srv-credential').value.trim();
  const fingerprint = document.getElementById('pbs-srv-fingerprint').value.trim() || null;
  const description = document.getElementById('pbs-srv-desc').value.trim() || null;
  const is_active = document.getElementById('pbs-srv-active').checked;
  const is_production = document.getElementById('pbs-srv-production').checked;

  const btn = document.getElementById('pbs-srv-save-btn');
  setLoading(btn, true);

  try {
    const payload = { name, ip_address, port, username, token_id, fingerprint, description, is_active, is_production };
    if (credential) payload.credential = credential;

    if (_pbsEditingId) {
      await Api.put(`/admin/pbs/servers/${_pbsEditingId}`, payload);
      showAlert('pbs-servers-alert', 'Serveur PBS mis à jour.', 'success');
    } else {
      if (!credential) {
        showAlert('pbs-servers-alert', 'Le token secret est requis pour un nouveau serveur.', 'error');
        return;
      }
      if (!token_id) {
        showAlert('pbs-servers-alert', 'Le Token ID est requis.', 'error');
        return;
      }
      await Api.post('/admin/pbs/servers', payload);
      showAlert('pbs-servers-alert', 'Serveur PBS ajouté.', 'success');
    }

    cancelPbsServerForm();
    await loadPbsServers();
  } catch (err) {
    showAlert('pbs-servers-alert', 'Erreur: ' + err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function deletePbsServer(id, name) {
  if (!confirm(`Supprimer le serveur PBS "${name}" ?`)) return;
  clearAlert('pbs-servers-alert');
  try {
    await Api.delete(`/admin/pbs/servers/${id}`);
    showAlert('pbs-servers-alert', `Serveur PBS "${name}" supprimé.`, 'success');
    await loadPbsServers();
  } catch (err) {
    showAlert('pbs-servers-alert', 'Erreur: ' + err.message, 'error');
  }
}

function escapeHtmlCfg(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
