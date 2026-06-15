// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// LLMUI Entreprise v4.3 — /zadmin Feedback & Bug Reports

'use strict';

registerTab('feedback', (container) => loadFeedback(container));

function _escF(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const BUG_STATUS_LABELS = {
  new: '<span class="badge badge-error">Nouveau</span>',
  investigating: '<span class="badge badge-warning">En cours</span>',
  resolved: '<span class="badge badge-success">Résolu</span>',
};

async function loadFeedback(container) {
  container.innerHTML = `
    <div class="tab-header">
      <h2>Feedback &amp; Rapports de bugs</h2>
    </div>
    <div id="feedback-alert"></div>

    <!-- Stats -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-header"><h3>Statistiques de feedback</h3></div>
      <div class="card-body">
        <div id="feedback-stats-body"><div class="spinner" style="margin:1rem auto;"></div></div>
      </div>
    </div>

    <!-- Commentaires récents -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-header"><h3>Commentaires récents (unlikes avec commentaire)</h3></div>
      <div class="card-body">
        <div id="feedback-comments-body"><div class="spinner" style="margin:1rem auto;"></div></div>
      </div>
    </div>

    <!-- Bug reports -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <h3>Rapports de bugs</h3>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <select id="bug-status-filter" class="form-control" style="width:auto;min-width:140px;">
            <option value="">Tous</option>
            <option value="new">Nouveau</option>
            <option value="investigating">En cours</option>
            <option value="resolved">Résolu</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="_loadBugReports()">↻ Actualiser</button>
        </div>
      </div>
      <div class="card-body">
        <div id="bug-reports-body"><div class="spinner" style="margin:1rem auto;"></div></div>
      </div>
    </div>

    <!-- Bug detail modal -->
    <div class="modal-overlay" id="bug-modal" style="display:none;">
      <div class="modal" style="max-width:640px;width:95vw;">
        <div class="modal-header">
          <h3 id="bug-modal-title">Rapport de bug</h3>
          <button class="modal-close" onclick="document.getElementById('bug-modal').style.display='none'">×</button>
        </div>
        <div class="modal-body">
          <div id="bug-modal-body"></div>
          <div id="bug-modal-alert" style="margin-top:0.75rem;"></div>
        </div>
        <div class="modal-footer" id="bug-modal-footer"></div>
      </div>
    </div>
  `;

  document.getElementById('bug-status-filter').addEventListener('change', _loadBugReports);

  await Promise.all([_loadFeedbackStats(), _loadBugReports()]);
}

// ── Stats ──────────────────────────────────────────────────────────────────────

async function _loadFeedbackStats() {
  const statsEl = document.getElementById('feedback-stats-body');
  const commentsEl = document.getElementById('feedback-comments-body');
  if (!statsEl) return;

  try {
    const data = await Api.get('/admin/feedback/stats');
    const total = data.total_likes + data.total_unlikes;
    const pct = total > 0 ? Math.round(data.ratio * 100) : 0;
    const barColor = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1rem;">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--color-success);">👍 ${data.total_likes}</div>
          <div class="stat-label">Likes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--color-danger);">👎 ${data.total_unlikes}</div>
          <div class="stat-label">Unlikes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total feedbacks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.total_with_comment}</div>
          <div class="stat-label">Avec commentaire</div>
        </div>
      </div>
      <div style="margin-top:0.5rem;">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.3rem;">
          <span>Satisfaction globale</span>
          <span style="font-weight:600;">${pct}%</span>
        </div>
        <div style="background:var(--color-bg-secondary);border-radius:4px;height:8px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.4s;"></div>
        </div>
      </div>
    `;

    if (commentsEl) {
      if (!data.recent_comments || data.recent_comments.length === 0) {
        commentsEl.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.85rem;">Aucun commentaire pour l\'instant.</p>';
      } else {
        commentsEl.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:80px;">Type</th>
                <th>Commentaire</th>
                <th style="width:160px;">Utilisateur</th>
                <th style="width:140px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.recent_comments.map(c => `
                <tr>
                  <td>${c.value === 1
                    ? '<span class="badge badge-success">👍 Like</span>'
                    : '<span class="badge badge-error">👎 Unlike</span>'}</td>
                  <td style="font-size:0.85rem;">${_escF(c.comment)}</td>
                  <td style="font-size:0.8rem;color:var(--color-text-muted);">${_escF(c.user_email)}</td>
                  <td style="font-size:0.8rem;color:var(--color-text-muted);">${_fmtDate(c.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } catch (e) {
    if (statsEl) statsEl.innerHTML = `<p style="color:var(--color-danger);">Erreur : ${_escF(e.message)}</p>`;
  }
}

// ── Bug reports ────────────────────────────────────────────────────────────────

async function _loadBugReports() {
  const el = document.getElementById('bug-reports-body');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:1rem auto;"></div>';

  const filter = document.getElementById('bug-status-filter')?.value || '';
  const url = '/admin/feedback/bug-reports' + (filter ? `?status=${filter}` : '');

  try {
    const data = await Api.get(url);
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.85rem;">Aucun rapport de bug.</p>';
      return;
    }
    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:50px;">#</th>
            <th>Titre</th>
            <th style="width:160px;">Utilisateur</th>
            <th style="width:100px;">Statut</th>
            <th style="width:140px;">Date</th>
            <th style="width:100px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td style="color:var(--color-text-muted);font-size:0.8rem;">${r.id}</td>
              <td>
                <strong style="font-size:0.875rem;">${_escF(r.title)}</strong>
              </td>
              <td style="font-size:0.8rem;color:var(--color-text-muted);">${_escF(r.user_email || '—')}</td>
              <td>${BUG_STATUS_LABELS[r.status] || _escF(r.status)}</td>
              <td style="font-size:0.8rem;color:var(--color-text-muted);">${_fmtDate(r.created_at)}</td>
              <td>
                <button class="btn btn-secondary btn-sm" title="Voir détails"
                  onclick="openBugModal(${JSON.stringify(r).replace(/"/g,'&quot;')})">🔍</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--color-danger);">Erreur : ${_escF(e.message)}</p>`;
  }
}

function openBugModal(report) {
  document.getElementById('bug-modal-title').textContent = `#${report.id} — ${report.title}`;
  document.getElementById('bug-modal-alert').innerHTML = '';
  document.getElementById('bug-modal-body').innerHTML = `
    <table style="border-collapse:collapse;width:100%;font-size:0.875rem;">
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Statut</strong></td>
          <td>${BUG_STATUS_LABELS[report.status] || _escF(report.status)}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Utilisateur</strong></td>
          <td>${_escF(report.user_email || '—')}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Date</strong></td>
          <td>${_fmtDate(report.created_at)}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Page</strong></td>
          <td style="word-break:break-all;">${_escF(report.page_url || '—')}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Navigateur</strong></td>
          <td style="font-size:0.8rem;">${_escF(report.browser_info || '—')}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:var(--color-text-muted);white-space:nowrap;vertical-align:top;"><strong>Description</strong></td>
          <td style="white-space:pre-wrap;">${_escF(report.description)}</td></tr>
    </table>
  `;

  const footer = document.getElementById('bug-modal-footer');
  const statuses = [
    { value: 'new', label: '🆕 Nouveau' },
    { value: 'investigating', label: '🔍 En cours' },
    { value: 'resolved', label: '✅ Résolu' },
  ];
  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="document.getElementById('bug-modal').style.display='none'">Fermer</button>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
      ${statuses.filter(s => s.value !== report.status).map(s => `
        <button class="btn btn-primary btn-sm" onclick="_setBugStatus(${report.id}, '${s.value}')">${s.label}</button>
      `).join('')}
      <button class="btn btn-secondary btn-sm" style="color:var(--color-danger);border-color:var(--color-danger);"
        onclick="_deleteBugReport(${report.id})">🗑 Supprimer</button>
    </div>
  `;

  document.getElementById('bug-modal').style.display = 'flex';
}

async function _setBugStatus(id, status) {
  const alertEl = document.getElementById('bug-modal-alert');
  try {
    await Api.patch(`/admin/feedback/bug-reports/${id}`, { status });
    showToast('Statut mis à jour.', 'success');
    document.getElementById('bug-modal').style.display = 'none';
    await _loadBugReports();
  } catch (e) {
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-error">Erreur : ${_escF(e.message)}</div>`;
  }
}

async function _deleteBugReport(id) {
  if (!confirm('Supprimer ce rapport de bug ?')) return;
  try {
    await Api.delete(`/admin/feedback/bug-reports/${id}`);
    showToast('Rapport supprimé.', 'success');
    document.getElementById('bug-modal').style.display = 'none';
    await _loadBugReports();
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
  }
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CA') + ' ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}
