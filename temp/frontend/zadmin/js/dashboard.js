// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Dashboard

registerTab('dashboard', async (container) => {
  container.innerHTML = '<div class="spinner" style="margin:2rem auto;display:block"></div>';

  try {
    const data = await Api.get('/admin/dashboard/metrics');
    container.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Utilisateurs totaux</div>
          <div class="metric-value">${data.users.total}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Utilisateurs actifs</div>
          <div class="metric-value">${data.users.active}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Sessions actives</div>
          <div class="metric-value">${data.sessions.active}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">LLMs configurés</div>
          <div class="metric-value">${data.services.llms_configured}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Hosts Ollama</div>
          <div class="metric-value">${data.services.ollama_hosts}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Connexions (24h)</div>
          <div class="metric-value" style="color:var(--color-success)">${data.activity_24h.logins}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Erreurs (24h)</div>
          <div class="metric-value" style="color:var(--color-danger)">${data.activity_24h.errors}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Activité récente</h3>
          <button class="btn btn-secondary btn-sm" onclick="switchTab('logs')">Voir tous les logs</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Action</th><th>Utilisateur</th><th>Date</th><th>Statut</th></tr>
            </thead>
            <tbody>
              ${(data.recent_audit || []).map(log => `
                <tr>
                  <td><code style="font-size:0.75rem">${log.action}</code></td>
                  <td>${log.user_email || '—'}</td>
                  <td style="color:var(--color-text-secondary);font-size:0.75rem">${new Date(log.created_at).toLocaleString('fr-CA')}</td>
                  <td><span class="badge badge-${log.success ? 'success' : 'danger'}">${log.success ? 'OK' : 'Échec'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Erreur: ${err.message}</div>`;
  }
});
