// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet LoRA Training — gestion des configurations et jobs d'entraînement

registerTab('lora', (container) => loadLoraTab(container));

// ── Etat global ───────────────────────────────────────────────────────────────

let _loraConfigs = [];
let _loraJobs = [];
let _loraRemoteHosts = [];
let _loraAutoRefreshInterval = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _loraEsc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _loraStatusBadge(status) {
  const map = {
    pending:   '<span class="badge badge-info">En attente</span>',
    running:   '<span class="badge badge-warning"><span class="spinner" style="width:0.7rem;height:0.7rem;display:inline-block;margin-right:0.25rem"></span>En cours</span>',
    completed: '<span class="badge badge-success">Terminé</span>',
    failed:    '<span class="badge badge-danger">Echec</span>',
    cancelled: '<span class="badge" style="background:var(--color-bg-secondary);color:var(--color-text-muted)">Annulé</span>',
  };
  return map[status] || `<span class="badge">${_loraEsc(status)}</span>`;
}

function _loraFmtDate(iso) {
  if (!iso) return '<span style="color:var(--color-text-muted)">—</span>';
  try {
    return new Date(iso).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' });
  } catch (_) {
    return _loraEsc(iso);
  }
}

function _loraConfigName(configId) {
  const c = _loraConfigs.find(x => x.id === configId);
  return c ? c.name : `#${configId}`;
}

function _loraHostName(hostId) {
  if (!hostId) return '<span style="color:var(--color-text-muted)">—</span>';
  const h = _loraRemoteHosts.find(x => x.id === hostId);
  return h ? _loraEsc(h.name) : `#${hostId}`;
}

// ── Chargement principal ──────────────────────────────────────────────────────

async function loadLoraTab(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      <!-- Section Configurations -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Configurations LoRA (<span id="lora-config-count">—</span>)</h3>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="loraShowCreateForm()">+ Nouvelle configuration</button>
            <button class="btn btn-secondary btn-sm" onclick="loraRefreshAll()">Actualiser</button>
          </div>
        </div>
        <div id="lora-alert-configs"></div>
        <div id="lora-config-form-container"></div>
        <div id="lora-config-list">
          <div class="spinner" style="display:block;margin:2rem auto"></div>
        </div>
      </div>

      <!-- Section Jobs -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Jobs d'entraînement (<span id="lora-job-count">—</span>)</h3>
          <button class="btn btn-secondary btn-sm" onclick="loraFetchJobs()">Actualiser</button>
        </div>
        <div id="lora-alert-jobs"></div>
        <div id="lora-job-list">
          <div class="spinner" style="display:block;margin:2rem auto"></div>
        </div>
      </div>

    </div>`;

  // Charger les hôtes distants d'abord (pour le select)
  try {
    _loraRemoteHosts = await Api.get('/admin/remote-hosts');
  } catch (_) {
    _loraRemoteHosts = [];
  }

  await loraRefreshAll();
}

async function loraRefreshAll() {
  await Promise.all([loraFetchConfigs(), loraFetchJobs()]);
  _loraStartAutoRefresh();
}

// ── Auto-refresh pour les jobs en cours ───────────────────────────────────────

function _loraStartAutoRefresh() {
  if (_loraAutoRefreshInterval) {
    clearInterval(_loraAutoRefreshInterval);
    _loraAutoRefreshInterval = null;
  }
  const hasRunning = _loraJobs.some(j => j.status === 'running' || j.status === 'pending');
  if (hasRunning) {
    _loraAutoRefreshInterval = setInterval(async () => {
      await loraFetchJobs();
      const stillRunning = _loraJobs.some(j => j.status === 'running' || j.status === 'pending');
      if (!stillRunning && _loraAutoRefreshInterval) {
        clearInterval(_loraAutoRefreshInterval);
        _loraAutoRefreshInterval = null;
      }
    }, 15000);
  }
}

// ── Configurations — Fetch & Rendu ────────────────────────────────────────────

async function loraFetchConfigs() {
  const listEl = document.getElementById('lora-config-list');
  const countEl = document.getElementById('lora-config-count');
  if (!listEl) return;

  try {
    _loraConfigs = await Api.get('/admin/lora/configs');
    if (countEl) countEl.textContent = _loraConfigs.length;
    _loraRenderConfigs(listEl);
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div class="alert alert-error" style="margin:0.75rem">Erreur chargement configs: ${_loraEsc(err.message)}</div>`;
  }
}

function _loraRenderConfigs(listEl) {
  if (!_loraConfigs.length) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--color-text-muted)">
        <p style="font-size:1.5rem;margin-bottom:0.5rem">🧠</p>
        <p>Aucune configuration LoRA.</p>
        <p style="font-size:0.82rem;margin-top:0.5rem">Créez une configuration pour commencer l'entraînement.</p>
      </div>`;
    return;
  }

  // Trouver le dernier job par config
  const lastJobByConfig = {};
  for (const j of _loraJobs) {
    if (!lastJobByConfig[j.config_id] || j.id > lastJobByConfig[j.config_id].id) {
      lastJobByConfig[j.config_id] = j;
    }
  }

  listEl.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:3rem">#</th>
            <th>Nom</th>
            <th>Modèle de base</th>
            <th>Hôte distant</th>
            <th style="width:7rem">Dataset</th>
            <th style="width:9rem">Dernier job</th>
            <th style="width:7rem">Statut</th>
            <th style="width:14rem">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_loraConfigs.map(c => {
            const lastJob = lastJobByConfig[c.id];
            return `
              <tr>
                <td style="color:var(--color-text-muted);font-size:0.75rem">${c.id}</td>
                <td>
                  <div style="font-weight:500">${_loraEsc(c.name)}</div>
                  ${c.description ? `<div style="font-size:0.72rem;color:var(--color-text-muted)">${_loraEsc(c.description)}</div>` : ''}
                </td>
                <td style="font-family:monospace;font-size:0.8rem">${_loraEsc(c.base_model)}</td>
                <td>${_loraHostName(c.remote_host_id)}</td>
                <td>
                  ${c.has_dataset
                    ? '<span class="badge badge-success">Chargé</span>'
                    : '<span class="badge badge-warning">Manquant</span>'}
                </td>
                <td style="font-size:0.78rem;color:var(--color-text-muted)">
                  ${lastJob ? `#${lastJob.id} — ${_loraFmtDate(lastJob.started_at)}` : '—'}
                </td>
                <td>
                  ${c.is_active
                    ? '<span class="badge badge-success">Actif</span>'
                    : '<span class="badge badge-warning">Inactif</span>'}
                </td>
                <td>
                  <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" onclick="loraLaunchTraining(${c.id}, '${_loraEsc(c.name)}')">Lancer</button>
                    <button class="btn btn-secondary btn-sm" onclick="loraShowEditForm(${c.id})">Modifier</button>
                    <button class="btn btn-secondary btn-sm" onclick="loraInstallDeps(${c.remote_host_id || 0}, '${_loraEsc(c.name)}')">Deps</button>
                    <button class="btn btn-danger btn-sm" onclick="loraDeleteConfig(${c.id}, '${_loraEsc(c.name)}')">Suppr.</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Jobs — Fetch & Rendu ──────────────────────────────────────────────────────

async function loraFetchJobs() {
  const listEl = document.getElementById('lora-job-list');
  const countEl = document.getElementById('lora-job-count');
  if (!listEl) return;

  try {
    _loraJobs = await Api.get('/admin/lora/jobs');
    if (countEl) countEl.textContent = _loraJobs.length;
    _loraRenderJobs(listEl);
    // Mettre à jour le rendu des configs (dernier job)
    const configListEl = document.getElementById('lora-config-list');
    if (configListEl && _loraConfigs.length) _loraRenderConfigs(configListEl);
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div class="alert alert-error" style="margin:0.75rem">Erreur chargement jobs: ${_loraEsc(err.message)}</div>`;
  }
}

function _loraRenderJobs(listEl) {
  if (!_loraJobs.length) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--color-text-muted)">
        <p>Aucun job d'entraînement.</p>
        <p style="font-size:0.82rem;margin-top:0.5rem">Lancez un entraînement depuis une configuration.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width:3rem">#</th>
            <th>Configuration</th>
            <th style="width:9rem">Statut</th>
            <th style="width:10rem">Démarré</th>
            <th style="width:10rem">Terminé</th>
            <th>GGUF</th>
            <th>Modèle Ollama</th>
            <th style="width:14rem">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${_loraJobs.map(j => `
            <tr>
              <td style="color:var(--color-text-muted);font-size:0.75rem">${j.id}</td>
              <td style="font-weight:500">${_loraEsc(_loraConfigName(j.config_id))}</td>
              <td>${_loraStatusBadge(j.status)}</td>
              <td style="font-size:0.78rem">${_loraFmtDate(j.started_at)}</td>
              <td style="font-size:0.78rem">${_loraFmtDate(j.completed_at)}</td>
              <td style="font-family:monospace;font-size:0.72rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_loraEsc(j.gguf_file)}">
                ${j.gguf_file ? _loraEsc(j.gguf_file.split('/').pop()) : '<span style="color:var(--color-text-muted)">—</span>'}
              </td>
              <td>
                ${j.ollama_model
                  ? `<span class="badge badge-success">${_loraEsc(j.ollama_model)}</span>`
                  : '<span style="color:var(--color-text-muted)">—</span>'}
              </td>
              <td>
                <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
                  <button class="btn btn-secondary btn-sm" onclick="loraShowLogs(${j.id})">Logs</button>
                  <button class="btn btn-secondary btn-sm" onclick="loraSyncJob(${j.id})">Sync</button>
                  ${j.status === 'completed' && j.modelfile
                    ? `<button class="btn btn-primary btn-sm" onclick="loraPushOllama(${j.id})">Ollama</button>`
                    : ''}
                  ${j.status === 'running'
                    ? `<button class="btn btn-danger btn-sm" onclick="loraCancelJob(${j.id})">Annuler</button>`
                    : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Formulaire création/édition de config ─────────────────────────────────────

function loraShowCreateForm() {
  _loraRenderConfigForm(null);
}

async function loraShowEditForm(id) {
  try {
    const config = await Api.get(`/admin/lora/configs/${id}`);
    // Récupérer le dataset séparément (has_dataset, mais pas dataset_jsonl dans la réponse)
    // On passe l'objet config complet
    _loraRenderConfigForm(config);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

function _loraRenderConfigForm(config) {
  const isEdit = !!config;
  const container = document.getElementById('lora-config-form-container');
  if (!container) return;

  // Si le formulaire est déjà ouvert pour cette config, le fermer
  if (container.dataset.editId && parseInt(container.dataset.editId) === (config?.id)) {
    container.innerHTML = '';
    container.dataset.editId = '';
    return;
  }

  const hp = config?.hyperparams || {};
  const hostsOptions = _loraRemoteHosts.map(h =>
    `<option value="${h.id}" ${config?.remote_host_id === h.id ? 'selected' : ''}>${_loraEsc(h.name)} (${_loraEsc(h.host)})</option>`
  ).join('');

  container.innerHTML = `
    <div style="border:1px solid var(--color-border);border-radius:var(--radius);margin:0.75rem;padding:1.25rem;background:var(--color-bg-secondary)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h4 style="margin:0;font-size:1rem">${isEdit ? 'Modifier la configuration' : 'Nouvelle configuration LoRA'}</h4>
        <button class="btn btn-secondary btn-sm" onclick="loraCloseForm()">Annuler</button>
      </div>

      <div id="lora-form-alert"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">

        <div class="form-group">
          <label class="form-label">Nom <span style="color:var(--color-danger)">*</span></label>
          <input class="form-input" id="lf-name" type="text" maxlength="200"
            placeholder="llama3-custom-v1"
            value="${isEdit ? _loraEsc(config.name) : ''}" autocomplete="off">
        </div>

        <div class="form-group">
          <label class="form-label">Modèle de base <span style="color:var(--color-danger)">*</span></label>
          <input class="form-input" id="lf-base-model" type="text" maxlength="500"
            placeholder="unsloth/llama-3-8b-bnb-4bit"
            value="${isEdit ? _loraEsc(config.base_model) : ''}" autocomplete="off">
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Description</label>
          <input class="form-input" id="lf-description" type="text" maxlength="500"
            placeholder="Fine-tuning pour réponses en français"
            value="${isEdit ? _loraEsc(config.description || '') : ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Hôte distant <span style="color:var(--color-danger)">*</span></label>
          <select class="form-input" id="lf-remote-host">
            <option value="">-- Sélectionner un hôte GPU --</option>
            ${hostsOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Répertoire d'entraînement</label>
          <input class="form-input" id="lf-training-dir" type="text" maxlength="500"
            value="${isEdit ? _loraEsc(config.training_dir) : '/opt/dreamai-lora'}">
        </div>

        <div class="form-group">
          <label class="form-label">Nom modèle Ollama (pour push)</label>
          <input class="form-input" id="lf-ollama-name" type="text" maxlength="200"
            placeholder="llama3-custom:latest"
            value="${isEdit ? _loraEsc(config.ollama_model_name || '') : ''}">
        </div>

        <div class="form-group" style="display:flex;align-items:center;gap:0.75rem;padding-top:1.5rem">
          <label class="toggle">
            <input type="checkbox" id="lf-active" ${(!isEdit || config.is_active) ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:0.85rem">Configuration active</span>
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Dataset JSONL</label>
          <textarea class="form-input" id="lf-dataset" rows="8"
            placeholder='{"messages": [{"role": "user", "content": "Bonjour ?"}, {"role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?"}]}
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}'
            style="font-family:monospace;font-size:0.78rem;resize:vertical">${isEdit && config.has_dataset ? '# Dataset existant — rechargez pour remplacer' : ''}</textarea>
          <div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.25rem">
            Format JSONL : une ligne par exemple, chaque ligne = {"messages": [{...}, {...}]}
            ${isEdit && config.has_dataset ? ' | <strong>Dataset déjà configuré</strong> — laissez vide pour conserver.' : ''}
          </div>
        </div>

      </div>

      <!-- Hyperparamètres -->
      <div style="margin-top:1rem">
        <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.75rem;color:var(--color-text-secondary)">
          Hyperparamètres
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.75rem">

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Epochs</label>
            <input class="form-input" id="lf-hp-epochs" type="number" min="1" max="100"
              value="${hp.epochs ?? 3}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Batch size</label>
            <input class="form-input" id="lf-hp-batch" type="number" min="1" max="256"
              value="${hp.batch_size ?? 2}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Grad. accumulation</label>
            <input class="form-input" id="lf-hp-grad-acc" type="number" min="1" max="128"
              value="${hp.grad_accumulation ?? 4}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Learning rate</label>
            <input class="form-input" id="lf-hp-lr" type="number" step="0.00001" min="0.000001"
              value="${hp.learning_rate ?? 0.0002}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">LoRA r</label>
            <input class="form-input" id="lf-hp-lora-r" type="number" min="1" max="256"
              value="${hp.lora_r ?? 16}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">LoRA alpha</label>
            <input class="form-input" id="lf-hp-lora-alpha" type="number" min="1" max="512"
              value="${hp.lora_alpha ?? 32}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">LoRA dropout</label>
            <input class="form-input" id="lf-hp-lora-dropout" type="number" step="0.01" min="0" max="1"
              value="${hp.lora_dropout ?? 0.05}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Max seq. length</label>
            <input class="form-input" id="lf-hp-max-seq" type="number" min="64" max="32768"
              value="${hp.max_seq_length ?? 2048}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Warmup ratio</label>
            <input class="form-input" id="lf-hp-warmup" type="number" step="0.01" min="0" max="1"
              value="${hp.warmup_ratio ?? 0.05}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">Weight decay</label>
            <input class="form-input" id="lf-hp-wd" type="number" step="0.001" min="0" max="1"
              value="${hp.weight_decay ?? 0.01}">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size:0.78rem">LR scheduler</label>
            <select class="form-input" id="lf-hp-scheduler">
              <option value="cosine" ${(hp.lr_scheduler ?? 'cosine') === 'cosine' ? 'selected' : ''}>cosine</option>
              <option value="linear" ${hp.lr_scheduler === 'linear' ? 'selected' : ''}>linear</option>
              <option value="constant" ${hp.lr_scheduler === 'constant' ? 'selected' : ''}>constant</option>
            </select>
          </div>

        </div>
      </div>

      <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="loraCloseForm()">Annuler</button>
        <button class="btn btn-primary" id="lora-form-submit" onclick="loraSubmitForm(${isEdit ? config.id : 'null'})">
          ${isEdit ? 'Enregistrer les modifications' : 'Créer la configuration'}
        </button>
      </div>
    </div>`;

  container.dataset.editId = isEdit ? String(config.id) : '';
  // Scroll vers le formulaire
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loraCloseForm() {
  const container = document.getElementById('lora-config-form-container');
  if (container) {
    container.innerHTML = '';
    container.dataset.editId = '';
  }
}

function _loraReadFormData() {
  const val = id => document.getElementById(id)?.value?.trim() || '';
  const num = id => parseFloat(document.getElementById(id)?.value) || 0;
  const int = id => parseInt(document.getElementById(id)?.value) || 0;

  const datasetRaw = document.getElementById('lf-dataset')?.value?.trim() || '';
  // Ne pas envoyer le placeholder commentaire
  const dataset = datasetRaw.startsWith('#') ? null : (datasetRaw || null);

  const remoteHostVal = document.getElementById('lf-remote-host')?.value;
  const remote_host_id = remoteHostVal ? parseInt(remoteHostVal) : null;

  return {
    name: val('lf-name'),
    description: val('lf-description') || null,
    base_model: val('lf-base-model'),
    remote_host_id,
    dataset_jsonl: dataset,
    training_dir: val('lf-training-dir') || '/opt/dreamai-lora',
    ollama_model_name: val('lf-ollama-name') || null,
    is_active: document.getElementById('lf-active')?.checked ?? true,
    hyperparams: {
      epochs: int('lf-hp-epochs') || 3,
      batch_size: int('lf-hp-batch') || 2,
      grad_accumulation: int('lf-hp-grad-acc') || 4,
      learning_rate: num('lf-hp-lr') || 2e-4,
      lora_r: int('lf-hp-lora-r') || 16,
      lora_alpha: int('lf-hp-lora-alpha') || 32,
      lora_dropout: num('lf-hp-lora-dropout') || 0.05,
      max_seq_length: int('lf-hp-max-seq') || 2048,
      warmup_ratio: num('lf-hp-warmup') || 0.05,
      weight_decay: num('lf-hp-wd') || 0.01,
      lr_scheduler: document.getElementById('lf-hp-scheduler')?.value || 'cosine',
    },
  };
}

async function loraSubmitForm(configId) {
  const alertEl = document.getElementById('lora-form-alert');
  const submitBtn = document.getElementById('lora-form-submit');
  if (alertEl) alertEl.innerHTML = '';

  const data = _loraReadFormData();

  if (!data.name) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-error">Le nom est obligatoire.</div>';
    return;
  }
  if (!data.base_model) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-error">Le modèle de base est obligatoire.</div>';
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enregistrement…'; }

  try {
    if (configId) {
      await Api.put(`/admin/lora/configs/${configId}`, data);
      showToast('Configuration mise à jour.', 'success');
    } else {
      await Api.post('/admin/lora/configs', data);
      showToast('Configuration créée.', 'success');
    }
    loraCloseForm();
    await loraFetchConfigs();
  } catch (err) {
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-error">Erreur: ${_loraEsc(err.message)}</div>`;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = configId ? 'Enregistrer les modifications' : 'Créer la configuration'; }
  }
}

// ── Suppression config ────────────────────────────────────────────────────────

async function loraDeleteConfig(id, name) {
  if (!confirm(`Supprimer la configuration "${name}" ?\n\nTous les jobs associés seront supprimés.`)) return;
  try {
    await Api.delete(`/admin/lora/configs/${id}`);
    showToast(`Configuration "${name}" supprimée.`, 'success');
    loraCloseForm();
    await loraFetchConfigs();
    await loraFetchJobs();
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

// ── Lancement entraînement ────────────────────────────────────────────────────

async function loraLaunchTraining(configId, configName) {
  if (!confirm(`Lancer l'entraînement LoRA pour la configuration "${configName}" ?\n\nLe processus sera exécuté en arrière-plan sur l'hôte distant.`)) return;

  showToast(`Lancement de l'entraînement "${configName}"…`, 'info');

  try {
    const job = await Api.post(`/admin/lora/configs/${configId}/train`, {});
    showToast(`Job #${job.id} démarré (PID: ${job.remote_pid || '?'}).`, 'success');
    await loraFetchJobs();
    _loraStartAutoRefresh();
  } catch (err) {
    showToast('Erreur lancement: ' + err.message, 'error');
  }
}

// ── Synchronisation job ───────────────────────────────────────────────────────

async function loraSyncJob(jobId) {
  showToast(`Synchronisation du job #${jobId}…`, 'info');
  try {
    const job = await Api.post(`/admin/lora/jobs/${jobId}/sync`, {});
    showToast(`Job #${jobId} — statut: ${job.status}`, job.status === 'completed' ? 'success' : 'info');
    await loraFetchJobs();
    _loraStartAutoRefresh();
  } catch (err) {
    showToast('Erreur sync: ' + err.message, 'error');
  }
}

// ── Logs ──────────────────────────────────────────────────────────────────────

async function loraShowLogs(jobId) {
  // D'abord récupérer le job frais avec les logs
  let job;
  try {
    job = await Api.get(`/admin/lora/jobs/${jobId}`);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:860px;width:95%">
      <div class="modal-header">
        <h3 class="modal-title">Logs — Job #${job.id} (${_loraEsc(job.status)})</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.82rem;color:var(--color-text-muted)">
          ${job.job_dir ? `<span><strong>Dir:</strong> <code>${_loraEsc(job.job_dir)}</code></span>` : ''}
          ${job.remote_pid ? `<span><strong>PID:</strong> ${job.remote_pid}</span>` : ''}
          ${job.gguf_file ? `<span><strong>GGUF:</strong> <code>${_loraEsc(job.gguf_file)}</code></span>` : ''}
          ${job.error_message ? `<div class="alert alert-error" style="width:100%;margin:0">${_loraEsc(job.error_message)}</div>` : ''}
        </div>
        <pre style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);padding:1rem;font-size:0.75rem;overflow:auto;max-height:500px;white-space:pre-wrap;word-break:break-all">${_loraEsc(job.log_tail || '(Aucun log disponible — cliquez sur Sync pour actualiser)')}</pre>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="loraSyncJobFromModal(${jobId}, this.closest('.modal-overlay'))">Actualiser logs</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(modal);
}

async function loraSyncJobFromModal(jobId, modalEl) {
  try {
    const job = await Api.post(`/admin/lora/jobs/${jobId}/sync`, {});
    const pre = modalEl.querySelector('pre');
    if (pre) pre.textContent = job.log_tail || '(Aucun log)';
    const title = modalEl.querySelector('.modal-title');
    if (title) title.textContent = `Logs — Job #${job.id} (${job.status})`;
    await loraFetchJobs();
  } catch (err) {
    showToast('Erreur sync: ' + err.message, 'error');
  }
}

// ── Push Ollama ───────────────────────────────────────────────────────────────

async function loraPushOllama(jobId) {
  const job = _loraJobs.find(j => j.id === jobId);
  const config = _loraConfigs.find(c => c.id === job?.config_id);
  const defaultName = config?.ollama_model_name || `lora-job-${jobId}:latest`;

  const modelName = prompt(`Nom du modèle Ollama à créer:\n(ex: mon-modele:latest)`, defaultName);
  if (!modelName) return;

  showToast(`Push vers Ollama: ${modelName}…`, 'info');

  try {
    const res = await Api.post(`/admin/lora/jobs/${jobId}/push-ollama`, { model_name: modelName });
    showToast(`Modèle "${modelName}" créé dans Ollama.`, 'success');

    // Afficher la sortie
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px;width:95%">
        <div class="modal-header">
          <h3 class="modal-title">Push Ollama — ${_loraEsc(modelName)}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <pre style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);padding:1rem;font-size:0.75rem;overflow:auto;max-height:400px;white-space:pre-wrap">${_loraEsc(res.output || '')}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
        </div>
      </div>`;
    document.getElementById('modal-container').appendChild(modal);

    await loraFetchJobs();
  } catch (err) {
    showToast('Erreur push Ollama: ' + err.message, 'error');
  }
}

// ── Annulation job ────────────────────────────────────────────────────────────

async function loraCancelJob(jobId) {
  if (!confirm(`Annuler le job #${jobId} ?\n\nLe processus d'entraînement sera tué sur l'hôte distant.`)) return;
  try {
    await Api.delete(`/admin/lora/jobs/${jobId}/cancel`);
    showToast(`Job #${jobId} annulé.`, 'success');
    await loraFetchJobs();
    _loraStartAutoRefresh();
  } catch (err) {
    showToast('Erreur annulation: ' + err.message, 'error');
  }
}

// ── Installation dépendances ──────────────────────────────────────────────────

async function loraInstallDeps(remoteHostId, configName) {
  if (!remoteHostId) {
    showToast('Aucun hôte distant configuré pour cette configuration.', 'error');
    return;
  }
  const host = _loraRemoteHosts.find(h => h.id === remoteHostId);
  if (!host) {
    showToast('Hôte distant introuvable.', 'error');
    return;
  }

  if (!confirm(`Installer les dépendances Unsloth sur "${host.name}" ?\n\nCela peut prendre plusieurs minutes.`)) return;

  showToast(`Installation dépendances sur ${host.name}…`, 'info');

  try {
    const res = await Api.post('/admin/lora/install-deps', { remote_host: host.name });

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:700px;width:95%">
        <div class="modal-header">
          <h3 class="modal-title">Installation dépendances — ${_loraEsc(host.name)}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <pre style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);padding:1rem;font-size:0.75rem;overflow:auto;max-height:400px;white-space:pre-wrap">${_loraEsc(res.output || 'Installation terminée.')}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
        </div>
      </div>`;
    document.getElementById('modal-container').appendChild(modal);

    showToast('Installation terminée.', 'success');
  } catch (err) {
    showToast('Erreur installation: ' + err.message, 'error');
  }
}
