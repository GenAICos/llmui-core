// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// LLMUI Entreprise v4.3 — /zadmin Andy Skills

'use strict';

registerTab('skills', (container) => loadSkills(container));

// ── Helpers ────────────────────────────────────────────────────────────────────

function _esc2(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _skAlert(msg, type = 'error') {
  const el = document.getElementById('skills-alert');
  if (el) el.innerHTML = `<div class="alert alert-${type}">${_esc2(msg)}</div>`;
}

function _skClearAlert() {
  const el = document.getElementById('skills-alert');
  if (el) el.innerHTML = '';
}

// ── Rendu principal ────────────────────────────────────────────────────────────

async function loadSkills(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Andy Skills — Personas spécialisés</h2>
    </div>
    <div id="skills-alert"></div>
    <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1.25rem;">
      Les skills permettent à vos utilisateurs d'activer un persona spécialisé dans Andy
      (Review PR, Software Dev TDD, Jira Manager, QA, Reverse Engineering…).
      Cliquez sur un skill pour modifier son prompt système.
    </p>
    <div id="skills-list"><div class="spinner" style="margin:2rem auto;"></div></div>

    <!-- ── Modal édition ── -->
    <div class="modal-overlay" id="skill-modal" style="display:none;">
      <div class="modal" style="max-width:680px;width:95vw;">
        <div class="modal-header">
          <h3 id="skill-modal-title">Modifier le skill</h3>
          <button class="modal-close" onclick="closeSkillModal()">×</button>
        </div>
        <div class="modal-body">
          <div id="skill-modal-alert"></div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label>Slug</label>
            <input type="text" id="skill-modal-slug" class="form-control" disabled />
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label for="skill-modal-desc">Description</label>
            <input type="text" id="skill-modal-desc" class="form-control"
              placeholder="Courte description affichée dans le sélecteur" />
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label for="skill-modal-prompt">Prompt système (talker)</label>
            <textarea id="skill-modal-prompt" class="form-control" rows="14"
              style="font-family:monospace;font-size:0.8rem;resize:vertical;"></textarea>
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label for="skill-modal-tools-prompt">
              Prompt outils (tools_manager)
              <span style="font-size:0.75rem;color:var(--color-text-muted);">
                — ajouté au prompt tools_manager quand ce skill est actif
              </span>
            </label>
            <textarea id="skill-modal-tools-prompt" class="form-control" rows="6"
              style="font-family:monospace;font-size:0.8rem;resize:vertical;"
              placeholder="(optionnel) Laisser vide si ce skill n'a pas d'outils supplémentaires"></textarea>
          </div>
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.25rem;">
            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;">
              <input type="checkbox" id="skill-modal-active" />
              <span>Actif</span>
            </label>
            <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;">
              <input type="checkbox" id="skill-modal-admin-only" />
              <span>Réservé aux admins</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSkillModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveSkillModal()">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  await _loadSkillsList();
}

// ── Liste ──────────────────────────────────────────────────────────────────────

const _CATEGORY_LABELS = { professional: '💼 Professionnel', personal: '👤 Personnel' };

async function _loadSkillsList() {
  const list = document.getElementById('skills-list');
  if (!list) return;
  try {
    const data = await Api.get('/admin/skills/');
    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.85rem;">Aucun skill disponible.</p>';
      return;
    }

    // Grouper par catégorie
    const groups = {};
    data.forEach(s => {
      const cat = s.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });

    let html = '';
    for (const [cat, skills] of Object.entries(groups)) {
      html += `
        <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-text-muted);
                   text-transform:uppercase;letter-spacing:0.06em;margin:1.25rem 0 0.6rem;">
          ${_esc2(_CATEGORY_LABELS[cat] || cat)}
        </h3>
        <div class="card" style="margin-bottom:1rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px;"></th>
                <th>Skill</th>
                <th>Description</th>
                <th style="width:90px;">Statut</th>
                <th style="width:100px;">Accès</th>
                <th style="width:80px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${skills.map(s => `
                <tr>
                  <td style="text-align:center;font-size:1.1rem;">${_esc2(s.icon || '')}</td>
                  <td>
                    <strong>${_esc2(s.name)}</strong>
                    <div style="font-size:0.75rem;color:var(--color-text-muted);font-family:monospace;">${_esc2(s.slug)}</div>
                  </td>
                  <td style="font-size:0.82rem;color:var(--color-text-muted);">${_esc2(s.description || '—')}</td>
                  <td>
                    <span class="badge ${s.is_active ? 'badge-success' : 'badge-secondary'}">
                      ${s.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style="font-size:0.8rem;">
                    ${s.is_admin_only
                      ? '<span class="badge badge-warning">Admin</span>'
                      : '<span class="badge badge-secondary">Tous</span>'}
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" title="Modifier"
                      onclick="openSkillModal('${_esc2(s.slug)}')">✏️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = `<p style="color:var(--color-danger);">Erreur : ${_esc2(e.message)}</p>`;
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────────

let _editingSkillSlug = null;

async function openSkillModal(slug) {
  _editingSkillSlug = slug;
  try {
    const skill = await Api.get(`/admin/skills/${encodeURIComponent(slug)}`);
    document.getElementById('skill-modal-title').textContent = `${skill.icon || ''} ${skill.name}`;
    document.getElementById('skill-modal-slug').value = skill.slug;
    document.getElementById('skill-modal-desc').value = skill.description || '';
    document.getElementById('skill-modal-prompt').value = skill.system_prompt || '';
    document.getElementById('skill-modal-tools-prompt').value = skill.tools_prompt || '';
    document.getElementById('skill-modal-active').checked = skill.is_active;
    document.getElementById('skill-modal-admin-only').checked = skill.is_admin_only;
    const alertEl = document.getElementById('skill-modal-alert');
    if (alertEl) alertEl.innerHTML = '';
    document.getElementById('skill-modal').style.display = 'flex';
    document.getElementById('skill-modal-prompt').focus();
  } catch (e) {
    _skAlert('Erreur lors du chargement du skill : ' + e.message);
  }
}

function closeSkillModal() {
  document.getElementById('skill-modal').style.display = 'none';
  _editingSkillSlug = null;
}

async function saveSkillModal() {
  if (!_editingSkillSlug) return;
  const alertEl = document.getElementById('skill-modal-alert');
  const prompt = document.getElementById('skill-modal-prompt').value;
  const toolsPrompt = document.getElementById('skill-modal-tools-prompt').value;
  const desc = document.getElementById('skill-modal-desc').value.trim();
  const isActive = document.getElementById('skill-modal-active').checked;
  const isAdminOnly = document.getElementById('skill-modal-admin-only').checked;

  if (!prompt.trim()) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-error">Le prompt système ne peut pas être vide.</div>';
    return;
  }

  try {
    await Api.put(`/admin/skills/${encodeURIComponent(_editingSkillSlug)}/`, {
      system_prompt: prompt,
      tools_prompt: toolsPrompt || null,
      description: desc || null,
      is_active: isActive,
      is_admin_only: isAdminOnly,
    });
    showToast('Skill enregistré.', 'success');
    closeSkillModal();
    await _loadSkillsList();
  } catch (e) {
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-error">Erreur : ${_esc2(e.message)}</div>`;
  }
}
