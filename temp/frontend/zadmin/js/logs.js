// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Logs

let _logsPage = 1;
let _logsAction = '';

registerTab('logs', (container) => loadLogs(container));

function loadLogs(container) {
  container.innerHTML = `
    <div class="toolbar">
      <input type="text" id="logs-action-filter" placeholder="Filtrer par action..." value="${_logsAction}" style="max-width:300px">
      <button class="btn btn-secondary" onclick="exportAuditLogs()">Exporter CSV</button>
      <button class="btn btn-secondary" onclick="loadLogs(document.getElementById('tab-logs'))">Actualiser</button>
    </div>
    <div id="logs-content"><div class="spinner" style="display:block;margin:2rem auto"></div></div>
  `;

  document.getElementById('logs-action-filter')?.addEventListener('input', (e) => {
    _logsAction = e.target.value;
    _logsPage = 1;
    fetchLogs();
  });

  fetchLogs();
}

async function fetchLogs() {
  const content = document.getElementById('logs-content');
  if (!content) return;

  try {
    const params = new URLSearchParams({ page: _logsPage, per_page: 50 });
    if (_logsAction) params.set('action', _logsAction);

    const data = await Api.get(`/admin/logs/audit?${params}`);
    content.innerHTML = `
      <div class="table-container">
        <table>
          <thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>IP</th><th>Ressource</th><th>Statut</th></tr></thead>
          <tbody>
            ${data.items.map(log => `
              <tr>
                <td style="font-size:0.75rem;white-space:nowrap">${new Date(log.created_at).toLocaleString('fr-CA')}</td>
                <td><code style="font-size:0.75rem">${log.action}</code></td>
                <td style="font-size:0.875rem">${log.user_email || '—'}</td>
                <td style="font-size:0.75rem;color:var(--color-text-muted)">${log.ip_address || '—'}</td>
                <td style="font-size:0.75rem">${log.resource_type ? `${log.resource_type}${log.resource_id ? '#'+log.resource_id : ''}` : '—'}</td>
                <td><span class="badge badge-${log.success ? 'success' : 'danger'}">${log.success ? 'OK' : 'Échec'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination" style="margin-top:1rem">
        ${Array.from({length: Math.min(data.pages, 10)}, (_, i) => i + 1).map(p => `
          <button class="${p === data.page ? 'active' : ''}" onclick="_logsPage=${p};fetchLogs()">${p}</button>
        `).join('')}
        ${data.pages > 10 ? '...' : ''}
      </div>
      <p style="text-align:center;color:var(--color-text-muted);font-size:0.75rem;margin-top:0.5rem">${data.total} entrée(s)</p>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function exportAuditLogs() {
  window.open(`/api/admin/logs/audit/export`, '_blank');
}
