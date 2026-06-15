// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet LLMs — Pipeline multi-agent + gestion des configs LLM

registerTab('llms', (container) => loadLLMs(container));

// ── État partagé ──────────────────────────────────────────────────────────────
let _allModels = [];       // [{name, host_id, host_name, size, modified_at}]
let _llmConfigs = [];      // [{id, name, provider, model_id, keepalive, max_tokens, num_ctx, context_length, ...}]
let _currentMode = 'conversation';
let _pipelineTimeouts = { conversation: 30, analyse: 120, programmation: 120 };
let _reactConfig = { max_tool_iter: 8, max_bg_iter: 12, feedback_max_chars: 24000 };  // boucles ReAct
let _llmSettings = { num_ctx_default_to_max: true };  // politique défaut num_ctx

// ── Auto-refresh toutes les 15 minutes ────────────────────────────────────────

const LLM_AUTO_REFRESH_MS = 15 * 60 * 1000;
let _llmRefreshTimer   = null;
let _llmCountdownTimer = null;
let _llmNextRefreshAt  = null;

function _startLlmAutoRefresh() {
  _stopLlmAutoRefresh();
  _llmNextRefreshAt = Date.now() + LLM_AUTO_REFRESH_MS;

  _llmRefreshTimer = setTimeout(() => {
    const container = document.getElementById('tab-llms');
    if (container) loadLLMs(container);
  }, LLM_AUTO_REFRESH_MS);

  _llmCountdownTimer = setInterval(_updateLlmCountdown, 1000);
  _updateLlmCountdown();
}

function _stopLlmAutoRefresh() {
  if (_llmRefreshTimer)   { clearTimeout(_llmRefreshTimer);   _llmRefreshTimer = null; }
  if (_llmCountdownTimer) { clearInterval(_llmCountdownTimer); _llmCountdownTimer = null; }
}

function _updateLlmCountdown() {
  const el = document.getElementById('llm-auto-refresh-countdown');
  if (!el) return;
  const remaining = Math.max(0, Math.round((_llmNextRefreshAt - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  el.textContent = `Actualisation auto dans ${m}:${String(s).padStart(2, '0')}`;
}

// Rôles par mode (miroir de MODE_ROLES backend)
const MODE_ROLES = {
  conversation:  ['talker', 'task_analyser', 'memory_manager', 'rag_manager', 'web_crawler', 'tools_manager'],
  analyse:       ['talker', 'merger', 'worker_1', 'worker_2', 'worker_3', 'task_analyser', 'memory_manager', 'rag_manager', 'web_crawler', 'tools_manager'],
  programmation: ['talker', 'merger', 'worker_1', 'worker_2', 'worker_3', 'task_analyser', 'memory_manager', 'rag_manager', 'web_crawler', 'tools_manager'],
};

const ROLE_LABELS = {
  talker:         'Talker (Interface)',
  merger:         'Merger (Cohérence)',
  worker_1:       'Worker 1',
  worker_2:       'Worker 2',
  worker_3:       'Worker 3',
  task_analyser:  'Task Analyser',
  memory_manager: 'Memory Manager',
  rag_manager:    'RAG Manager',
  web_crawler:    'Web Crawler',
  tools_manager:  'Tools Manager',
};

// ── Chargement principal ──────────────────────────────────────────────────────

async function loadLLMs(container) {
  _stopLlmAutoRefresh();
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';
  try {
    const [modelsResp, llms, syncStatus, timeouts, reactCfg, llmSettings] = await Promise.all([
      Api.get('/admin/pipeline/models/all'),
      Api.get('/admin/llms/'),
      Api.get('/admin/llms/sync-status').catch(() => null),
      Api.get('/admin/pipeline/timeouts').catch(() => null),
      Api.get('/admin/pipeline/react').catch(() => null),
      Api.get('/admin/llms/settings').catch(() => null),
    ]);
    _allModels = modelsResp.models || [];
    _llmConfigs = llms || [];
    if (timeouts) _pipelineTimeouts = timeouts;
    if (reactCfg) _reactConfig = reactCfg;
    _llmSettings = llmSettings || _llmSettings;

    container.innerHTML = `
      <div id="section-pipeline"></div>
      <div id="section-vision" style="margin-top:1.5rem"></div>
      <div id="section-llms-list" style="margin-top:1.5rem"></div>
    `;

    renderPipelineSection(document.getElementById('section-pipeline'));
    await loadVisionSection(document.getElementById('section-vision'));
    renderLlmsTable(document.getElementById('section-llms-list'), _llmConfigs, syncStatus, _llmSettings);
    _startLlmAutoRefresh();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Section 1 : Pipeline multi-agent ─────────────────────────────────────────

function renderPipelineSection(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Pipeline Multi-Agent</h3>
        <div style="display:flex;gap:0.5rem">
          ${['conversation', 'analyse', 'programmation'].map(m => `
            <button id="mode-btn-${m}"
              class="btn btn-sm ${m === _currentMode ? 'btn-primary' : 'btn-secondary'}"
              onclick="switchMode('${m}')">
              ${m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          `).join('')}
        </div>
      </div>
      <div id="pipeline-role-grid" style="margin-top:1rem"></div>
      <div id="pipeline-timeouts" style="margin-top:0.75rem"></div>
      <div id="pipeline-react" style="margin-top:0.5rem"></div>
    </div>
  `;
  loadPipelineMode(_currentMode);
  renderTimeoutsSection(document.getElementById('pipeline-timeouts'));
  renderReactSection(document.getElementById('pipeline-react'));
}

function switchMode(mode) {
  _currentMode = mode;
  ['conversation', 'analyse', 'programmation'].forEach(m => {
    const btn = document.getElementById(`mode-btn-${m}`);
    if (btn) {
      btn.className = `btn btn-sm ${m === mode ? 'btn-primary' : 'btn-secondary'}`;
    }
  });
  loadPipelineMode(mode);
}

async function loadPipelineMode(mode) {
  const grid = document.getElementById('pipeline-role-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="spinner" style="display:block;margin:1rem auto"></div>';
  try {
    const modeConfig = await Api.get(`/admin/pipeline/${mode}`);
    renderRoleGrid(grid, mode, modeConfig.roles || {});
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function renderRoleGrid(grid, mode, rolesConfig) {
  const roles = MODE_ROLES[mode] || [];

  const rows = roles.map(role => {
    const cfg = rolesConfig[role] || {};
    const primaryId = cfg.llm_config ? cfg.llm_config.id : '';
    const fallbackId = cfg.fallback_llm_config ? cfg.fallback_llm_config.id : '';
    const label = ROLE_LABELS[role] || role;

    const primaryHost = cfg.llm_config ? _hostLabel(cfg.llm_config) : null;
    const fallbackHost = cfg.fallback_llm_config ? _hostLabel(cfg.fallback_llm_config) : null;

    return `
      <tr>
        <td style="padding:0.5rem 0.75rem;white-space:nowrap">
          <strong style="font-size:0.875rem">${label}</strong>
        </td>
        <td style="padding:0.5rem 0.75rem">
          <select id="pr-${mode}-${role}" style="width:100%;min-width:200px"
            onchange="savePipelineRole('${mode}','${role}',this.value,document.getElementById('fb-${mode}-${role}').value);updateHostBadge('pr-${mode}-${role}','hb-pr-${mode}-${role}')">
            ${buildLLMOptions(_llmConfigs, primaryId)}
          </select>
          <div id="hb-pr-${mode}-${role}" style="font-size:0.7rem;color:var(--color-text-muted);margin-top:2px;padding-left:2px">
            ${primaryHost ? `<code>${primaryHost}</code>` : ''}
          </div>
        </td>
        <td style="padding:0.5rem 0.75rem">
          <select id="fb-${mode}-${role}" style="width:100%;min-width:200px"
            onchange="savePipelineRole('${mode}','${role}',document.getElementById('pr-${mode}-${role}').value,this.value);updateHostBadge('fb-${mode}-${role}','hb-fb-${mode}-${role}')">
            ${buildLLMOptions(_llmConfigs, fallbackId)}
          </select>
          <div id="hb-fb-${mode}-${role}" style="font-size:0.7rem;color:var(--color-text-muted);margin-top:2px;padding-left:2px">
            ${fallbackHost ? `<code>${fallbackHost}</code>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  grid.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border)">
            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.75rem;text-transform:uppercase;color:var(--color-text-muted)">Rôle</th>
            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.75rem;text-transform:uppercase;color:var(--color-text-muted)">Modèle primaire</th>
            <th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.75rem;text-transform:uppercase;color:var(--color-text-muted)">Modèle fallback</th>
          </tr>
        </thead>
        <tbody id="role-tbody-${mode}">${rows}</tbody>
      </table>
    </div>
    <p style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.5rem;padding:0 0.75rem">
      Les modifications sont sauvegardées automatiquement au changement de sélection.
    </p>
  `;
}

function _hostLabel(llm) {
  // Cherche le nom du host via _allModels (qui a host_id + host_name)
  if (llm.ollama_host_id) {
    const m = _allModels.find(x => x.host_id === llm.ollama_host_id);
    if (m) return m.host_name;
  }
  const url = llm.ollama_host_url || llm.endpoint_url;
  if (url) {
    // Raccourcir l'URL: garder juste IP:port
    try { return new URL(url).host; } catch { return url; }
  }
  return 'Autre';
}

function buildLLMOptions(llms, selectedId) {
  const opts = ['<option value="">— Non assigné —</option>'];

  // Grouper par host
  const groups = {};
  llms.forEach(l => {
    const host = _hostLabel(l);
    if (!groups[host]) groups[host] = [];
    groups[host].push(l);
  });

  Object.keys(groups).sort().forEach(host => {
    opts.push(`<optgroup label="${host}">`);
    groups[host].forEach(l => {
      const sel = String(l.id) === String(selectedId) ? ' selected' : '';
      opts.push(`<option value="${l.id}"${sel}>${l.model_id}</option>`);
    });
    opts.push('</optgroup>');
  });

  return opts.join('');
}

async function savePipelineRole(mode, role, primaryRaw, fallbackRaw) {
  const primaryId = primaryRaw ? parseInt(primaryRaw, 10) : null;
  const fallbackId = fallbackRaw ? parseInt(fallbackRaw, 10) : null;
  try {
    await Api.put(`/admin/pipeline/${mode}/${role}`, {
      llm_config_id: primaryId,
      fallback_llm_config_id: fallbackId,
    });
    showToast(`${ROLE_LABELS[role] || role} sauvegardé`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateHostBadge(selectId, badgeId) {
  const sel = document.getElementById(selectId);
  const badge = document.getElementById(badgeId);
  if (!sel || !badge) return;
  const llmId = sel.value;
  if (!llmId) { badge.innerHTML = ''; return; }
  const llm = _llmConfigs.find(l => String(l.id) === String(llmId));
  badge.innerHTML = llm ? `<code>${_hostLabel(llm)}</code>` : '';
}

// ── Timeouts LLM par mode ──────────────────────────────────────────────────────────────────────────────

const MODE_TIMEOUT_LABELS = {
  conversation:   'Conversation',
  analyse:        'Analyse',
  programmation:  'Programmation',
};

function renderTimeoutsSection(container) {
  if (!container) return;
  const modes = ['conversation', 'analyse', 'programmation'];

  const fields = modes.map(mode => `
    <div style="display:flex;flex-direction:column;gap:0.25rem">
      <label style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--color-text-muted);letter-spacing:0.05em">
        ${MODE_TIMEOUT_LABELS[mode]}
      </label>
      <div style="display:flex;align-items:center;gap:0.35rem">
        <input
          id="timeout-${mode}"
          type="number"
          value="${_pipelineTimeouts[mode] ?? 30}"
          min="5" max="3600"
          style="width:72px;padding:0.3rem 0.4rem;font-size:0.875rem;
                 border:1px solid var(--color-border);border-radius:var(--radius-sm);
                 background:var(--color-input-bg);color:var(--color-text);text-align:right"
          onblur="saveModeTimeout('${mode}', this)"
          onkeydown="if(event.key==='Enter')this.blur()"
          title="Timeout en secondes (5 – 3600)"
        >
        <span style="font-size:0.8rem;color:var(--color-text-muted)">s</span>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="border-top:1px solid var(--color-border);padding-top:0.75rem;margin-top:0.25rem">
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
        <span style="font-size:0.75rem;font-weight:600;color:var(--color-text-muted);
                     text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap">
          Timeout LLM
        </span>
        <div style="display:flex;gap:1.25rem;flex-wrap:wrap">
          ${fields}
        </div>
        <span style="font-size:0.7rem;color:var(--color-text-muted);margin-left:auto">
          Durée max d’attente de réponse par requête
        </span>
      </div>
    </div>
  `;
}

async function saveModeTimeout(mode, input) {
  const val = parseInt(input.value, 10);
  if (!val || val < 5) { input.value = 5; return; }
  if (val > 3600) { input.value = 3600; return; }
  try {
    await Api.put(`/admin/pipeline/${mode}/timeout`, { timeout_s: val });
    _pipelineTimeouts[mode] = val;
    showToast(`Timeout ${MODE_TIMEOUT_LABELS[mode]} : ${val} s`, 'success');
  } catch (err) {
    showToast('Erreur sauvegarde timeout : ' + err.message, 'error');
    input.value = _pipelineTimeouts[mode] ?? 30;
  }
}

// ── Boucles ReAct (bornes d'itération + plafond de contexte) ────────────────────

const REACT_FIELDS = [
  { id: 'react-max-tool', key: 'max_tool_iter',      i18n: 'conv', min: 1,    max: 50,     unit: '×' },
  { id: 'react-max-bg',   key: 'max_bg_iter',        i18n: 'bg',   min: 1,    max: 100,    unit: '×' },
  { id: 'react-feedback', key: 'feedback_max_chars', i18n: 'ctx',  min: 2000, max: 200000, unit: 'c' },
];

function renderReactSection(container) {
  if (!container) return;
  const tr = (k) => I18n.t('llms.react.' + k);

  const fields = REACT_FIELDS.map(f => `
    <div style="display:flex;flex-direction:column;gap:0.25rem">
      <label style="font-size:0.7rem;font-weight:600;text-transform:uppercase;color:var(--color-text-muted);letter-spacing:0.05em">
        ${tr(f.i18n)}
      </label>
      <div style="display:flex;align-items:center;gap:0.35rem">
        <input
          id="${f.id}"
          type="number"
          value="${_reactConfig[f.key] ?? ''}"
          min="${f.min}" max="${f.max}"
          style="width:84px;padding:0.3rem 0.4rem;font-size:0.875rem;
                 border:1px solid var(--color-border);border-radius:var(--radius-sm);
                 background:var(--color-input-bg);color:var(--color-text);text-align:right"
          onblur="saveReactConfig()"
          onkeydown="if(event.key==='Enter')this.blur()"
          title="${tr(f.i18n + '_tip')}"
        >
        <span style="font-size:0.8rem;color:var(--color-text-muted)">${f.unit}</span>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="border-top:1px solid var(--color-border);padding-top:0.75rem;margin-top:0.25rem">
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
        <span style="font-size:0.75rem;font-weight:600;color:var(--color-text-muted);
                     text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap">
          ${tr('title')}
        </span>
        <div style="display:flex;gap:1.25rem;flex-wrap:wrap">
          ${fields}
        </div>
        <span style="font-size:0.7rem;color:var(--color-text-muted);margin-left:auto">
          ${tr('hint')}
        </span>
      </div>
    </div>
  `;
}

async function saveReactConfig() {
  const clamp = (raw, lo, hi, dflt) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  };
  const payload = {
    max_tool_iter:      clamp(document.getElementById('react-max-tool').value, 1, 50, _reactConfig.max_tool_iter),
    max_bg_iter:        clamp(document.getElementById('react-max-bg').value, 1, 100, _reactConfig.max_bg_iter),
    feedback_max_chars: clamp(document.getElementById('react-feedback').value, 2000, 200000, _reactConfig.feedback_max_chars),
  };
  try {
    const saved = await Api.put('/admin/pipeline/react', payload);
    _reactConfig = saved;
    // Refléter les valeurs réellement enregistrées (bornées côté serveur)
    REACT_FIELDS.forEach(f => {
      const el = document.getElementById(f.id);
      if (el && saved[f.key] != null) el.value = saved[f.key];
    });
    showToast(I18n.t('llms.react.saved'), 'success');
  } catch (err) {
    showToast(I18n.t('llms.react.error') + err.message, 'error');
  }
}

// ── Section 2 : Vision / OCR ──────────────────────────────────────────────────

async function loadVisionSection(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Vision / OCR</h3>
        <span style="font-size:0.75rem;color:var(--color-text-muted)">Partagé entre tous les modes</span>
      </div>
      <div id="vision-loading" style="padding:1rem"><div class="spinner" style="display:block;margin:0 auto"></div></div>
    </div>
  `;
  try {
    const vision = await Api.get('/admin/pipeline/vision');
    const primaryId = vision.llm_config ? vision.llm_config.id : '';
    const fallbackId = vision.fallback_llm_config ? vision.fallback_llm_config.id : '';

    const vPrimaryHost = vision.llm_config ? _hostLabel(vision.llm_config) : null;
    const vFallbackHost = vision.fallback_llm_config ? _hostLabel(vision.fallback_llm_config) : null;

    document.getElementById('vision-loading').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0.5rem 0">
        <div class="form-group" style="margin:0">
          <label>Modèle primaire</label>
          <select id="vision-primary" onchange="saveVision();updateHostBadge('vision-primary','vision-primary-host')">
            ${buildLLMOptions(_llmConfigs, primaryId)}
          </select>
          <div id="vision-primary-host" style="font-size:0.7rem;color:var(--color-text-muted);margin-top:2px;padding-left:2px">
            ${vPrimaryHost ? `<code>${vPrimaryHost}</code>` : ''}
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label>Modèle fallback</label>
          <select id="vision-fallback" onchange="saveVision();updateHostBadge('vision-fallback','vision-fallback-host')">
            ${buildLLMOptions(_llmConfigs, fallbackId)}
          </select>
          <div id="vision-fallback-host" style="font-size:0.7rem;color:var(--color-text-muted);margin-top:2px;padding-left:2px">
            ${vFallbackHost ? `<code>${vFallbackHost}</code>` : ''}
          </div>
        </div>
      </div>
      <p style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.25rem">
        Modifications sauvegardées automatiquement.
      </p>
    `;
  } catch (err) {
    const el = document.getElementById('vision-loading');
    if (el) el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function saveVision() {
  const primaryEl = document.getElementById('vision-primary');
  const fallbackEl = document.getElementById('vision-fallback');
  if (!primaryEl || !fallbackEl) return;
  try {
    await Api.put('/admin/pipeline/vision', {
      llm_config_id: primaryEl.value ? parseInt(primaryEl.value, 10) : null,
      fallback_llm_config_id: fallbackEl.value ? parseInt(fallbackEl.value, 10) : null,
    });
    showToast('Vision / OCR sauvegardé', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Section 3 : LLMs disponibles ─────────────────────────────────────────────

function renderLlmsTable(container, llms, syncStatus, settings) {
  const defaultToMax = settings ? settings.num_ctx_default_to_max !== false : true;
  const lastSyncText = syncStatus && syncStatus.last_sync_at
    ? `Dernier sync auto : ${new Date(syncStatus.last_sync_at).toLocaleString('fr-CA')}`
    : 'Aucun sync auto encore effectué';

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>LLMs disponibles</h3>
          <div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:2px">
            ${lastSyncText}
            &nbsp;·&nbsp;
            <span id="llm-auto-refresh-countdown"></span>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm" onclick="showCreateLLMModal()">+ Ajouter LLM</button>
          <button id="sync-ollama-btn" class="btn btn-secondary btn-sm" onclick="syncFromOllama()">⟳ Sync Ollama</button>
          <button class="btn btn-secondary btn-sm" onclick="loadLLMs(document.getElementById('tab-llms'))">Actualiser</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;padding:0.6rem 0.25rem;border-bottom:1px solid var(--color-border)">
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0;font-size:0.85rem;white-space:nowrap">
          <input type="checkbox" ${defaultToMax ? 'checked' : ''} onchange="toggleNumCtxDefault(this)" style="width:auto">
          <strong>Au sync : num_ctx = contexte max du modèle</strong>
        </label>
        <span style="font-size:0.75rem;color:var(--color-text-muted)">
          ${defaultToMax
            ? '⚠️ ON — les nouveaux LLM prennent le contexte max annoncé (VRAM élevée possible).'
            : 'OFF — num_ctx laissé vide → défaut Ollama (sûr). Tu montes manuellement par LLM.'}
        </span>
      </div>
      ${llms.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">🤖</div><h3>Aucun LLM configuré</h3><p>Ajoutez votre premier LLM ci-dessus.</p></div>'
        : `
          <div class="table-container" style="margin-top:1rem">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Fournisseur</th>
                  <th>HOST</th>
                  <th>Temp.</th>
                  <th>Max Tokens</th>
                  <th>Contexte</th>
                  <th>Keepalive</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${llms.map(l => `
                  <tr>
                    <td>
                      <strong>${l.name}</strong>
                      ${l.is_default ? ' <span class="badge badge-success">Défaut</span>' : ''}
                      ${l.ollama_host_is_cloud ? ' <span class="badge badge-info">Cloud</span>' : ''}
                    </td>
                    <td><span class="badge badge-info">${l.provider}</span></td>
                    <td><code style="font-size:0.75rem">${l.ollama_host_url || l.endpoint_url || '—'}</code></td>
                    <td>${l.temperature}</td>
                    <td>
                      <input type="number" value="${l.max_tokens}" min="1" max="${l.ollama_host_is_cloud ? 1048576 : 131072}"
                        style="width:80px;padding:0.25rem 0.4rem;font-size:0.875rem;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-input-bg);color:var(--color-text)"
                        onblur="updateMaxTokens(${l.id}, this)"
                        onkeydown="if(event.key==='Enter')this.blur()">
                    </td>
                    <td>
                      <input type="number" value="${l.num_ctx ?? ''}" min="1" ${l.context_length ? `max="${l.context_length}"` : ''}
                        placeholder="${l.context_length ? '≤ ' + l.context_length : 'défaut'}"
                        title="${l.context_length ? 'Max annoncé par le modèle (Ollama) : ' + l.context_length + ' tokens' : 'Longueur de contexte non détectée — pinger l\'hôte / Sync Ollama'}"
                        style="width:90px;padding:0.25rem 0.4rem;font-size:0.875rem;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-input-bg);color:var(--color-text)"
                        onblur="updateNumCtx(${l.id}, this)"
                        onkeydown="if(event.key==='Enter')this.blur()">
                    </td>
                    <td>
                      <button id="ka-btn-${l.id}"
                        class="btn btn-sm ${l.keepalive ? 'btn-success' : 'btn-secondary'}"
                        onclick="toggleKeepalive(${l.id}, this)">
                        ${l.keepalive ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td><span class="badge badge-${l.is_active ? 'success' : 'danger'}">${l.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div style="display:flex;gap:0.25rem">
                        <button class="btn btn-secondary btn-sm" onclick="showEditLLMModal(${l.id})">Éditer</button>
                        <button class="btn btn-secondary btn-sm" onclick="showTestLLMModal(${l.id}, '${l.name.replace(/'/g, "\\'")}')">Tester</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteLLM(${l.id}, '${l.name.replace(/'/g, "\\'")}')">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
    </div>
  `;
}

// ── Sync depuis Ollama ────────────────────────────────────────────────────────

async function syncFromOllama() {
  const btn = document.getElementById('sync-ollama-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sync…'; }
  try {
    const result = await Api.post('/admin/llms/sync-ollama', {});
    showToast(result.message, result.created > 0 ? 'success' : 'info');
    if (result.created > 0) {
      loadLLMs(document.getElementById('tab-llms'));
    }
  } catch (err) {
    showToast('Sync Ollama échoué : ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Sync Ollama'; }
  }
}

// ── Keepalive toggle ──────────────────────────────────────────────────────────

async function toggleKeepalive(llmId, btn) {
  try {
    const updated = await Api.post(`/admin/llms/${llmId}/keepalive`, {});
    btn.textContent = updated.keepalive ? 'ON' : 'OFF';
    btn.className = `btn btn-sm ${updated.keepalive ? 'btn-success' : 'btn-secondary'}`;
    // Mise à jour du cache local
    const idx = _llmConfigs.findIndex(l => l.id === llmId);
    if (idx !== -1) _llmConfigs[idx].keepalive = updated.keepalive;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Max tokens inline ─────────────────────────────────────────────────────────

async function updateMaxTokens(llmId, input) {
  const val = parseInt(input.value, 10);
  if (!val || val < 1) { input.value = 8192; return; }
  try {
    await Api.put(`/admin/llms/${llmId}`, { max_tokens: val });
    showToast('Max tokens sauvegardé', 'success');
    const idx = _llmConfigs.findIndex(l => l.id === llmId);
    if (idx !== -1) _llmConfigs[idx].max_tokens = val;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Fenêtre de contexte (num_ctx) inline ──────────────────────────────────────

async function updateNumCtx(llmId, input) {
  const idx = _llmConfigs.findIndex(l => l.id === llmId);
  const cfg = idx !== -1 ? _llmConfigs[idx] : null;
  const raw = input.value.trim();

  // Champ vidé : on ne peut pas remettre à NULL via l'API → on restaure la valeur courante.
  if (raw === '') { input.value = cfg && cfg.num_ctx != null ? cfg.num_ctx : ''; return; }

  const val = parseInt(raw, 10);
  if (isNaN(val) || val < 1) {
    showToast('Fenêtre de contexte invalide (entier ≥ 1)', 'error');
    input.value = cfg && cfg.num_ctx != null ? cfg.num_ctx : '';
    return;
  }
  // Borne haute = longueur de contexte annoncée par le modèle (si connue).
  if (cfg && cfg.context_length && val > cfg.context_length) {
    showToast(`Maximum annoncé par le modèle : ${cfg.context_length} tokens`, 'error');
    input.value = cfg.num_ctx != null ? cfg.num_ctx : cfg.context_length;
    return;
  }
  try {
    await Api.put(`/admin/llms/${llmId}`, { num_ctx: val });
    showToast('Fenêtre de contexte sauvegardée', 'success');
    if (cfg) cfg.num_ctx = val;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Politique de défaut num_ctx (switch global) ───────────────────────────────

async function toggleNumCtxDefault(checkbox) {
  const enabled = checkbox.checked;
  try {
    const res = await Api.put('/admin/llms/settings', { num_ctx_default_to_max: enabled });
    _llmSettings = res || { num_ctx_default_to_max: enabled };
    showToast(enabled
      ? 'Défaut num_ctx = contexte max du modèle (au prochain sync)'
      : 'Défaut num_ctx = vide → défaut Ollama (au prochain sync)', 'success');
    // Recharge pour rafraîchir le texte d'aide du bandeau.
    loadLLMs(document.getElementById('tab-llms'));
  } catch (err) {
    checkbox.checked = !enabled;  // rollback visuel
    showToast(err.message, 'error');
  }
}

// ── Modal : Créer LLM ─────────────────────────────────────────────────────────

function showCreateLLMModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <h3 class="modal-title">Nouveau LLM</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-llm-alert"></div>
      <form id="create-llm-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>Nom *</label><input name="name" required placeholder="Mon LLM Local"></div>
          <div class="form-group">
            <label>Fournisseur *</label>
            <select name="provider">
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI-compatible</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>
          <div class="form-group"><label>Identifiant du modèle *</label><input name="model_id" required placeholder="llama3.2:3b"></div>
          <div class="form-group"><label>URL endpoint</label><input name="endpoint_url" placeholder="http://localhost:11434"></div>
          <div class="form-group"><label>Température</label><input name="temperature" type="number" step="0.1" min="0" max="2" value="0.7"></div>
          <div class="form-group"><label>Max Tokens</label><input name="max_tokens" type="number" value="8192" min="1"></div>
          <div class="form-group"><label>Fenêtre de contexte (num_ctx)</label><input name="num_ctx" type="number" min="1" placeholder="défaut Ollama — auto au Sync"></div>
        </div>
        <div class="form-group"><label>Prompt système</label><textarea name="system_prompt" rows="3"></textarea></div>
        <div class="form-group"><label>Clé API (si requise)</label><input type="password" name="api_key" placeholder="sk-..."></div>
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="keepalive" value="true" style="width:auto">
            <span>Keepalive (précharger en mémoire GPU au démarrage)</span>
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="is_active" value="true" checked style="width:auto">
            <span>Actif</span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-llm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name'),
      provider: fd.get('provider'),
      model_id: fd.get('model_id'),
      endpoint_url: fd.get('endpoint_url') || null,
      temperature: parseFloat(fd.get('temperature')) || 0.7,
      max_tokens: parseInt(fd.get('max_tokens'), 10) || 8192,
      num_ctx: fd.get('num_ctx') ? parseInt(fd.get('num_ctx'), 10) : null,
      system_prompt: fd.get('system_prompt') || null,
      api_key: fd.get('api_key') || null,
      keepalive: fd.get('keepalive') === 'true',
      is_active: fd.get('is_active') === 'true',
    };
    try {
      await Api.post('/admin/llms/', payload);
      modal.remove();
      showToast('LLM créé', 'success');
      loadLLMs(document.getElementById('tab-llms'));
    } catch (err) {
      showAlert('create-llm-alert', err.message);
    }
  });
}

// ── Modal : Éditer LLM ────────────────────────────────────────────────────────

async function showEditLLMModal(llmId) {
  const llm = _llmConfigs.find(l => l.id === llmId);
  if (!llm) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <h3 class="modal-title">Éditer : ${llm.name}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="edit-llm-alert"></div>
      <form id="edit-llm-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>Nom *</label><input name="name" required value="${llm.name}"></div>
          <div class="form-group">
            <label>Fournisseur</label>
            <select name="provider" disabled>
              <option value="${llm.provider}" selected>${llm.provider}</option>
            </select>
          </div>
          <div class="form-group"><label>URL endpoint</label><input name="endpoint_url" value="${llm.endpoint_url || ''}"></div>
          <div class="form-group"><label>Température</label><input name="temperature" type="number" step="0.1" min="0" max="2" value="${llm.temperature}"></div>
          <div class="form-group">
            <label>Max Tokens${llm.ollama_host_is_cloud ? ' <span class="badge badge-info" style="font-size:0.7rem">Cloud — jusqu\'à 1M</span>' : ''}</label>
            <input name="max_tokens" type="number" value="${llm.max_tokens}" min="1" max="${llm.ollama_host_is_cloud ? 1048576 : 131072}">
          </div>
          <div class="form-group">
            <label>Fenêtre de contexte (num_ctx)${llm.context_length ? ` <span class="badge badge-info" style="font-size:0.7rem">max modèle : ${llm.context_length}</span>` : ''}</label>
            <input name="num_ctx" type="number" value="${llm.num_ctx ?? ''}" min="1" ${llm.context_length ? `max="${llm.context_length}"` : ''} placeholder="défaut Ollama">
          </div>
        </div>
        <div class="form-group"><label>Prompt système</label><textarea name="system_prompt" rows="3">${llm.system_prompt || ''}</textarea></div>
        <div class="form-group"><label>Clé API (laisser vide pour conserver)</label><input type="password" name="api_key" placeholder="sk-..."></div>
        <div style="display:flex;gap:1.5rem;margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="keepalive" value="true" ${llm.keepalive ? 'checked' : ''} style="width:auto">
            <span>Keepalive</span>
          </label>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="is_active" value="true" ${llm.is_active ? 'checked' : ''} style="width:auto">
            <span>Actif</span>
          </label>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
            <input type="checkbox" name="is_default" value="true" ${llm.is_default ? 'checked' : ''} style="width:auto">
            <span>Par défaut</span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#edit-llm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name'),
      endpoint_url: fd.get('endpoint_url') || null,
      temperature: parseFloat(fd.get('temperature')) || 0.7,
      max_tokens: parseInt(fd.get('max_tokens'), 10) || 8192,
      system_prompt: fd.get('system_prompt') || null,
      keepalive: fd.get('keepalive') === 'true',
      is_active: fd.get('is_active') === 'true',
      is_default: fd.get('is_default') === 'true',
    };
    // num_ctx envoyé uniquement s'il est renseigné (l'API n'efface pas vers NULL).
    if (fd.get('num_ctx')) payload.num_ctx = parseInt(fd.get('num_ctx'), 10);
    if (fd.get('api_key')) payload.api_key = fd.get('api_key');
    try {
      await Api.put(`/admin/llms/${llmId}`, payload);
      modal.remove();
      showToast('LLM mis à jour', 'success');
      loadLLMs(document.getElementById('tab-llms'));
    } catch (err) {
      showAlert('edit-llm-alert', err.message);
    }
  });
}

// ── Modal : Tester LLM ────────────────────────────────────────────────────────

function showTestLLMModal(llmId, name) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Tester : ${name}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="form-group"><label>Prompt de test</label><textarea id="test-prompt" rows="3">Bonjour ! Réponds en une phrase.</textarea></div>
      <div id="test-result" style="margin:1rem 0"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
        <button id="run-test-btn" class="btn btn-primary">Lancer le test</button>
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#run-test-btn').addEventListener('click', async () => {
    const btn = modal.querySelector('#run-test-btn');
    const prompt = modal.querySelector('#test-prompt').value;
    setLoading(btn, true);
    modal.querySelector('#test-result').innerHTML = '<div class="spinner" style="display:block;margin:1rem auto"></div>';
    try {
      const result = await Api.post('/admin/llms/test', { llm_config_id: llmId, prompt });
      modal.querySelector('#test-result').innerHTML = result.success
        ? `<div class="alert alert-success"><strong>Réponse (${result.latency_ms}ms) :</strong><br><pre style="white-space:pre-wrap;margin-top:0.5rem">${result.response}</pre></div>`
        : `<div class="alert alert-error">Erreur : ${result.error}</div>`;
    } catch (err) {
      modal.querySelector('#test-result').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Suppression LLM ───────────────────────────────────────────────────────────

async function deleteLLM(id, name) {
  if (!confirm(`Supprimer le LLM "${name}" ? Les rôles pipeline assignés seront libérés.`)) return;
  try {
    await Api.delete(`/admin/llms/${id}`);
    showToast('LLM supprimé', 'success');
    loadLLMs(document.getElementById('tab-llms'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}
