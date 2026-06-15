// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// LLMUI Entreprise v4.3 — /zadmin Pipeline tab

'use strict';

registerTab('pipeline', (container) => loadPipeline(container));

// ── State ────────────────────────────────────────────────────────────────────

var _pipelinePrompts = [];   // [{mode, role, role_label, system_prompt, default_prompt, is_custom}]
var _pipelineFilter  = 'all';

var PIPELINE_MODES = ['conversation', 'analyse', 'programmation'];
var MODE_LABELS    = { conversation: 'Conversation', analyse: 'Analyse', programmation: 'Programmation' };

// ── Entry point ───────────────────────────────────────────────────────────────

async function loadPipeline(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Pipeline — Instructions système des rôles LLM</h2>
      <p class="text-muted" style="margin:0;font-size:0.875rem">
        Personnalisez les instructions envoyées à chaque LLM. Laissez le champ vide pour utiliser le prompt par défaut.
      </p>
    </div>

    <div id="pipeline-alert"></div>

    <div id="detection-config"><div class="spinner"></div></div>

    <div class="pipeline-mode-tabs" style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm pipeline-filter-btn" data-filter="all"            onclick="setPipelineFilter('all')">Tous les modes</button>
      <button class="btn btn-secondary btn-sm pipeline-filter-btn" data-filter="conversation" onclick="setPipelineFilter('conversation')">Conversation</button>
      <button class="btn btn-secondary btn-sm pipeline-filter-btn" data-filter="analyse"      onclick="setPipelineFilter('analyse')">Analyse</button>
      <button class="btn btn-secondary btn-sm pipeline-filter-btn" data-filter="programmation" onclick="setPipelineFilter('programmation')">Programmation</button>
    </div>

    <div id="pipeline-prompts-grid"><div class="spinner"></div></div>
  `;

  await fetchAndRenderDetection();
  await fetchAndRenderPrompts();
}

// ── Détection / comptage d'objets (Cellpose) ────────────────────────────────────

async function fetchAndRenderDetection() {
  try {
    const cfg = await Api.get('/admin/pipeline/detection');
    renderDetectionCard(cfg);
  } catch (err) {
    const el = document.getElementById('detection-config');
    if (el) el.innerHTML = `<div class="alert alert-danger" style="margin-bottom:1.5rem">Erreur chargement config détection: ${escHtml(err.message)}</div>`;
  }
}

function renderDetectionCard(cfg) {
  const el = document.getElementById('detection-config');
  if (!el) return;

  const models = (cfg.valid_models && cfg.valid_models.length) ? cfg.valid_models : ['cyto3', 'cyto2', 'cyto', 'nuclei'];
  const opts = models.map(m => `<option value="${escHtml(m)}" ${m === cfg.model ? 'selected' : ''}>${escHtml(m)}</option>`).join('');

  const availBadge = cfg.available
    ? `<span class="badge badge-success" style="font-size:0.7rem;padding:2px 8px">Moteur disponible</span>`
    : `<span class="badge badge-secondary" style="font-size:0.7rem;padding:2px 8px;opacity:0.85">Cellpose non installé</span>`;

  const availWarn = cfg.available ? '' : `
    <div class="alert alert-warning" style="margin-bottom:0.75rem;font-size:0.82rem">
      Le moteur Cellpose n'est pas installé sur le serveur — le comptage sera ignoré jusqu'à :
      <code>pip install cellpose</code> puis redémarrage du service.
    </div>`;

  el.innerHTML = `
    <div class="card" style="padding:1rem;margin-bottom:2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;gap:0.5rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <strong style="font-size:0.95rem">🔬 Détection / Comptage d'objets (Cellpose)</strong>
          ${availBadge}
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveDetectionConfig()">Sauvegarder</button>
      </div>
      <p class="text-muted" style="font-size:0.8rem;margin:0 0 0.75rem">
        Compte les objets distincts sur les images jointes (ex. spores, cellules) par segmentation.
        Le résultat (compte + image annotée) est renvoyé à l'utilisateur et résumé par Andy.
      </p>
      ${availWarn}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0.75rem;align-items:end">
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem">
          <input type="checkbox" id="det-enabled" ${cfg.enabled ? 'checked' : ''}/> Activer le comptage
        </label>
        <label style="font-size:0.8rem">Modèle
          <select id="det-model" class="form-control">${opts}</select>
        </label>
        <label style="font-size:0.8rem">Diamètre (px, 0 = auto)
          <input type="number" id="det-diameter" class="form-control" min="0" max="1000" step="1" value="${Number(cfg.diameter) || 0}"/>
        </label>
        <label style="font-size:0.8rem">Taille min (px)
          <input type="number" id="det-min-size" class="form-control" min="0" max="100000" step="1" value="${Number(cfg.min_size) || 0}"/>
        </label>
        <label style="font-size:0.8rem">Flow threshold
          <input type="number" id="det-flow" class="form-control" min="-10" max="10" step="0.1" value="${Number(cfg.flow_threshold) || 0}"/>
        </label>
        <label style="font-size:0.8rem">Cellprob threshold
          <input type="number" id="det-cellprob" class="form-control" min="-10" max="10" step="0.1" value="${Number(cfg.cellprob_threshold) || 0}"/>
        </label>
      </div>
      <p class="text-muted" style="font-size:0.76rem;margin:0.75rem 0 0">
        Astuce spores : le <strong>diamètre</strong> est le réglage clé. Laissez 0 (auto), puis ajustez
        à la taille moyenne d'une spore en pixels si le comptage est imprécis.
      </p>
    </div>
  `;
}

async function saveDetectionConfig() {
  const payload = {
    enabled: document.getElementById('det-enabled').checked,
    model: document.getElementById('det-model').value,
    diameter: parseFloat(document.getElementById('det-diameter').value) || 0,
    min_size: parseInt(document.getElementById('det-min-size').value, 10) || 0,
    flow_threshold: parseFloat(document.getElementById('det-flow').value) || 0,
    cellprob_threshold: parseFloat(document.getElementById('det-cellprob').value) || 0,
  };
  try {
    const cfg = await Api.put('/admin/pipeline/detection', payload);
    renderDetectionCard(cfg);
    showPipelineAlert('success', 'Configuration de détection sauvegardée.');
  } catch (err) {
    showPipelineAlert('error', `Erreur sauvegarde détection: ${err.message}`);
  }
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchAndRenderPrompts() {
  try {
    const data = await Api.get('/admin/pipeline/prompts');
    _pipelinePrompts = data;
    renderPromptsGrid();
  } catch (err) {
    showPipelineAlert('error', `Erreur chargement des prompts: ${err.message}`);
    const el = document.getElementById('pipeline-prompts-grid');
    if (el) el.innerHTML = '';
  }
}

// ── Filter ────────────────────────────────────────────────────────────────────

function setPipelineFilter(filter) {
  _pipelineFilter = filter;
  document.querySelectorAll('.pipeline-filter-btn').forEach(btn => {
    btn.className = `btn btn-sm pipeline-filter-btn ${btn.dataset.filter === filter ? 'btn-primary' : 'btn-secondary'}`;
  });
  renderPromptsGrid();
}

// ── Prompts section ───────────────────────────────────────────────────────────

function renderPromptsGrid() {
  const grid = document.getElementById('pipeline-prompts-grid');
  if (!grid) return;

  const filtered = _pipelineFilter === 'all'
    ? _pipelinePrompts
    : _pipelinePrompts.filter(p => p.mode === _pipelineFilter);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>Aucun rôle trouvé.</p></div>';
    return;
  }

  const byMode = {};
  filtered.forEach(p => {
    if (!byMode[p.mode]) byMode[p.mode] = [];
    byMode[p.mode].push(p);
  });

  const modeLabels = { conversation: 'Conversation', analyse: 'Analyse', programmation: 'Programmation', shared: 'Partagé (Vision)' };

  let html = '';
  for (const [mode, prompts] of Object.entries(byMode)) {
    html += `
      <div class="pipeline-mode-section" style="margin-bottom:2rem">
        <h3 style="font-size:0.95rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;
                   letter-spacing:0.05em;margin-bottom:0.75rem;padding-bottom:0.5rem;
                   border-bottom:1px solid var(--color-border)">
          ${modeLabels[mode] || mode}
        </h3>
        <div style="display:flex;flex-direction:column;gap:1rem">
          ${prompts.map(p => renderPromptCard(p)).join('')}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function renderPromptCard(p) {
  const textareaId = `prompt-ta-${p.mode}-${p.role}`;
  const badgeHtml  = p.is_custom
    ? `<span class="badge badge-success" style="font-size:0.7rem;padding:2px 8px">Personnalisé</span>`
    : `<span class="badge badge-secondary" style="font-size:0.7rem;padding:2px 8px;opacity:0.7">Défaut actif</span>`;

  const defaultBlock = p.default_prompt ? `
    <pre style="font-size:0.8rem;background:var(--color-bg-secondary);padding:0.75rem;border-radius:4px;
                white-space:pre-wrap;word-break:break-word;margin-bottom:0.6rem;
                border:1px solid var(--color-border);max-height:160px;overflow-y:auto;line-height:1.5">${escHtml(p.default_prompt)}</pre>
  ` : `<p class="text-muted" style="font-size:0.8rem;margin-bottom:0.6rem;font-style:italic">Aucun prompt par défaut défini.</p>`;

  return `
    <div class="card" style="padding:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;gap:0.5rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <strong style="font-size:0.9rem">${escHtml(p.role_label)}</strong>
          <code style="font-size:0.75rem;color:var(--color-text-muted);background:var(--color-bg-secondary);padding:1px 6px;border-radius:3px">${escHtml(p.role)}</code>
          ${badgeHtml}
        </div>
        <div style="display:flex;gap:0.4rem">
          ${p.is_custom ? `<button class="btn btn-secondary btn-sm" onclick="resetPrompt('${p.mode}','${p.role}')" title="Restaurer le prompt par défaut">Restaurer défaut</button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="savePrompt('${p.mode}','${p.role}','${textareaId}')">Sauvegarder</button>
        </div>
      </div>

      <div style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:0.3rem;font-weight:500">
        ${p.is_custom ? 'Prompt par défaut (référence) :' : 'Instructions actives envoyées au LLM :'}
      </div>
      ${defaultBlock}

      ${p.is_custom ? `
        <div style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:0.3rem;font-weight:500">Prompt personnalisé actif :</div>
      ` : `
        <div style="font-size:0.78rem;color:var(--color-text-muted);margin-bottom:0.3rem">Personnaliser (remplace le prompt par défaut) :</div>
      `}
      <textarea
        id="${textareaId}"
        class="form-control"
        rows="4"
        placeholder="Laissez vide pour utiliser le prompt par défaut ci-dessus…"
        style="font-family:monospace;font-size:0.85rem;resize:vertical"
      >${escHtml(p.system_prompt !== null ? p.system_prompt : '')}</textarea>
    </div>
  `;
}

// ── Prompt actions ────────────────────────────────────────────────────────────

async function savePrompt(mode, role, textareaId) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const value = ta.value.trim();
  const payload = { system_prompt: value || null };
  try {
    const updated = await Api.put(`/admin/pipeline/${mode}/${role}/prompt`, payload);
    const idx = _pipelinePrompts.findIndex(p => p.mode === mode && p.role === role);
    if (idx !== -1) _pipelinePrompts[idx] = updated;
    renderPromptsGrid();
    showPipelineAlert('success', `Prompt "${updated.role_label}" sauvegardé.`);
  } catch (err) {
    showPipelineAlert('error', `Erreur sauvegarde: ${err.message}`);
  }
}

async function resetPrompt(mode, role) {
  if (!confirm(`Restaurer le prompt par défaut pour le rôle "${role}" (mode: ${mode}) ?`)) return;
  try {
    const updated = await Api.delete(`/admin/pipeline/${mode}/${role}/prompt`);
    const idx = _pipelinePrompts.findIndex(p => p.mode === mode && p.role === role);
    if (idx !== -1) _pipelinePrompts[idx] = updated;
    renderPromptsGrid();
    showPipelineAlert('success', `Prompt "${updated.role_label}" réinitialisé au défaut.`);
  } catch (err) {
    showPipelineAlert('error', `Erreur réinitialisation: ${err.message}`);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showPipelineAlert(type, msg) {
  const el = document.getElementById('pipeline-alert');
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : 'success'}">${escHtml(msg)}</div>`;
  setTimeout(() => { if (el) el.innerHTML = ''; }, 4000);
}

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
