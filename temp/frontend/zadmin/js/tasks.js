// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet Tâches de fond Andy

let _tasksFilter = 'all';
let _tasksAutoRefresh = null;

registerTab('tasks', (container) => loadTasks(container));

// ── Helpers ────────────────────────────────────────────────────────────────────

function _taskStatusBadge(status) {
  const map = {
    pending:   ['warning', 'En attente'],
    running:   ['info',    'En cours'],
    paused:    ['warning', 'En pause'],
    completed: ['success', 'Terminée'],
    failed:    ['danger',  'Échouée'],
  };
  const [cls, label] = map[status] || ['primary', status];
  const spinner = status === 'running'
    ? '<span class="spinner" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:4px"></span>'
    : '';
  return `<span class="badge badge-${cls}">${spinner}${label}</span>`;
}

function _taskAge(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('fr-CA');
}

function _recurrenceLabel(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.round(minutes / 1440)}j`;
  return `${Math.round(minutes / 10080)}sem`;
}

function _nextRunLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d - now) / 1000);
  if (diff <= 0) return 'imminente';
  if (diff < 3600) return `dans ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `dans ${Math.floor(diff / 3600)}h`;
  return `le ${d.toLocaleDateString('fr-CA')}`;
}

function _escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Chargement principal ───────────────────────────────────────────────────────

async function loadTasks(container) {
  _stopTasksAutoRefresh();

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      <!-- Carte statut heartbeat -->
      <div class="card" id="tasks-hb-card">
        <div class="card-header">
          <h3 class="card-title">Heartbeat Andy</h3>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button class="btn btn-secondary btn-sm" onclick="triggerHeartbeat()">
              Déclencher maintenant
            </button>
            <button class="btn btn-secondary btn-sm" onclick="loadTasks(document.getElementById('tab-tasks'))">
              Actualiser
            </button>
          </div>
        </div>
        <div id="tasks-hb-status" style="color:var(--color-text-secondary);font-size:0.85rem">
          <div class="spinner" style="display:block;margin:0.75rem auto;width:20px;height:20px"></div>
        </div>
      </div>

      <!-- Tâches récurrentes (vue admin globale) -->
      <div class="card" id="recurring-tasks-card">
        <div class="card-header">
          <h3 class="card-title">🔄 Tâches récurrentes (<span id="recurring-count">—</span>)</h3>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button class="btn btn-primary btn-sm" onclick="showCreateTaskModal(true)">
              + Nouvelle tâche récurrente
            </button>
            <button class="btn btn-secondary btn-sm" onclick="fetchRecurringTasks()">
              Actualiser
            </button>
          </div>
        </div>
        <div id="recurring-content">
          <div class="spinner" style="display:block;margin:2rem auto"></div>
        </div>
      </div>

      <!-- Barre d'outils tâches (vue utilisateur courant) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Tâches de fond (<span id="tasks-count">—</span>)</h3>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <select class="header-lang-select" id="tasks-filter" title="Filtrer par statut">
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="running">En cours</option>
              <option value="paused">En pause</option>
              <option value="completed">Terminées</option>
              <option value="failed">Échouées</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="showCreateTaskModal()">
              + Nouvelle tâche
            </button>
            <button class="btn btn-secondary btn-sm" onclick="deleteAllCompleted()" id="tasks-clear-btn" style="display:none">
              Purger terminées
            </button>
          </div>
        </div>

        <div id="tasks-content">
          <div class="spinner" style="display:block;margin:2rem auto"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('tasks-filter').value = _tasksFilter;
  document.getElementById('tasks-filter').addEventListener('change', (e) => {
    _tasksFilter = e.target.value;
    fetchTasks();
  });

  await Promise.all([fetchHeartbeatStatus(), fetchTasks(), fetchRecurringTasks()]);

  // Auto-refresh toutes les 15 s si une tâche est en cours
  _startTasksAutoRefresh();
}

// ── Heartbeat status ───────────────────────────────────────────────────────────

async function fetchHeartbeatStatus() {
  const el = document.getElementById('tasks-hb-status');
  if (!el) return;
  try {
    const data = await Api.post('/support/heartbeat', { idle_seconds: 0 });
    if (!data.enabled) {
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0">
          <span class="badge badge-warning">Désactivé</span>
          <span>Le heartbeat est désactivé — activez-le dans <strong>Paramètres → Andy</strong>.</span>
        </div>`;
      return;
    }
    const pending = data.pending_count ?? 0;
    el.innerHTML = `
      <div style="display:flex;gap:1.5rem;flex-wrap:wrap;padding:0.5rem 0;align-items:center">
        <div style="display:flex;align-items:center;gap:0.4rem">
          <span class="badge badge-success">Actif</span>
          <span>Heartbeat opérationnel</span>
        </div>
        <div style="color:var(--color-text-secondary)">
          <strong style="color:var(--color-text)">${pending}</strong> tâche${pending !== 1 ? 's' : ''} en attente / en cours
        </div>
        ${data.completed_tasks?.length ? `
          <div style="color:var(--color-success);font-size:0.82rem">
            ${data.completed_tasks.length} tâche${data.completed_tasks.length > 1 ? 's' : ''} vient de se terminer
          </div>` : ''}
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error" style="margin:0.5rem 0">Erreur heartbeat: ${_escapeHtml(err.message)}</div>`;
  }
}

async function triggerHeartbeat() {
  try {
    const data = await Api.post('/support/heartbeat', { idle_seconds: 99999 });
    showToast(
      data.pending_count > 0
        ? `Heartbeat déclenché — ${data.pending_count} tâche(s) en file`
        : 'Heartbeat déclenché — aucune tâche en attente',
      'success'
    );
    await Promise.all([fetchHeartbeatStatus(), fetchTasks()]);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

// ── Tâches récurrentes (vue admin — tous utilisateurs) ─────────────────────────

async function fetchRecurringTasks() {
  const content = document.getElementById('recurring-content');
  const countEl = document.getElementById('recurring-count');
  if (!content) return;

  try {
    const tasks = await Api.get('/admin/tasks?recurring_only=true&limit=200');

    if (countEl) countEl.textContent = tasks.length;

    if (tasks.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--color-text-muted)">
          <p style="margin:0">Aucune tâche récurrente configurée.</p>
          <p style="margin:0.5rem 0 0;font-size:0.82rem">Créez-en une via le bouton ci-dessus ou demandez à Andy d'en créer une.</p>
        </div>`;
      return;
    }

    content.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width:3rem">#</th>
              <th style="width:10rem">Utilisateur</th>
              <th>Titre</th>
              <th style="width:7rem">Intervalle</th>
              <th style="width:8rem">Statut</th>
              <th style="width:9rem">Prochaine exéc.</th>
              <th style="width:10rem">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(t => `
              <tr>
                <td style="color:var(--color-text-muted);font-size:0.75rem">${t.id}</td>
                <td style="font-size:0.8rem">
                  <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px" title="${_escapeHtml(t.user_email || '')}">${_escapeHtml(t.user_name)}</div>
                </td>
                <td>
                  <div style="font-weight:500">${_escapeHtml(t.title)}</div>
                  ${t.description ? `<div style="color:var(--color-text-muted);font-size:0.72rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${_escapeHtml(t.description.substring(0, 100))}${t.description.length > 100 ? '…' : ''}</div>` : ''}
                </td>
                <td>
                  <span class="badge badge-info" style="font-size:0.75rem">🔄 ${_recurrenceLabel(t.recurrence_minutes)}</span>
                </td>
                <td>${_taskStatusBadge(t.status)}</td>
                <td style="font-size:0.78rem;color:var(--color-text-muted)">
                  ${t.next_run_at ? _nextRunLabel(t.next_run_at) : '—'}
                </td>
                <td>
                  <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm"
                      title="Forcer l'exécution immédiate"
                      onclick="adminForceRunTask(${t.id}, '${_escapeHtml(t.title.replace(/'/g, "\\'"))}')">
                      ▶ Exécuter
                    </button>
                    <button class="btn btn-danger btn-sm"
                      onclick="adminDeleteTask(${t.id}, '${_escapeHtml(t.title.replace(/'/g, "\\'"))}')">
                      Suppr.
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p style="text-align:right;color:var(--color-text-muted);font-size:0.75rem;padding:0.5rem 0.25rem">
        ${tasks.length} tâche${tasks.length !== 1 ? 's' : ''} récurrente${tasks.length !== 1 ? 's' : ''}
      </p>`;

  } catch (err) {
    if (content) {
      content.innerHTML = `<div class="alert alert-error" style="margin:0.75rem">Erreur: ${_escapeHtml(err.message)}</div>`;
    }
  }
}

async function adminForceRunTask(taskId, title) {
  if (!confirm(`Forcer l'exécution immédiate de la tâche "${title}" ?\n\nElle sera traitée au prochain heartbeat.`)) return;
  try {
    await Api.post(`/admin/tasks/${taskId}/run-now`, {});
    showToast(`Tâche #${taskId} planifiée pour exécution immédiate.`, 'success');
    await Promise.all([fetchRecurringTasks(), fetchTasks(), fetchHeartbeatStatus()]);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

async function adminDeleteTask(taskId, title) {
  if (!confirm(`Supprimer définitivement la tâche récurrente "${title}" ?\n\nCette action est irréversible.`)) return;
  try {
    await Api.delete(`/admin/tasks/${taskId}`);
    showToast(`Tâche #${taskId} supprimée.`, 'success');
    await Promise.all([fetchRecurringTasks(), fetchTasks()]);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

// ── Liste des tâches ───────────────────────────────────────────────────────────

async function fetchTasks() {
  const content = document.getElementById('tasks-content');
  const countEl = document.getElementById('tasks-count');
  const clearBtn = document.getElementById('tasks-clear-btn');
  if (!content) return;

  try {
    const all = await Api.get('/support/tasks');
    const filtered = _tasksFilter === 'all'
      ? all
      : all.filter(t => t.status === _tasksFilter);

    if (countEl) countEl.textContent = filtered.length;

    const hasCompleted = all.some(t => t.status === 'completed' || t.status === 'failed');
    if (clearBtn) clearBtn.style.display = hasCompleted ? '' : 'none';

    if (filtered.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:2.5rem;color:var(--color-text-muted)">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35;margin-bottom:0.75rem">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          <p>Aucune tâche${_tasksFilter !== 'all' ? ' avec ce statut' : ''}</p>
        </div>`;
      return;
    }

    // Index tasks by id for subtask lookup
    const taskMap = Object.fromEntries(all.map(t => [t.id, t]));

    content.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width:3rem">#</th>
              <th>Titre</th>
              <th style="width:9rem">Statut</th>
              <th style="width:8rem">Prochaine exéc.</th>
              <th style="width:8rem">Mise à jour</th>
              <th style="width:7rem">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(t => {
              const isSubtask = !!t.parent_task_id;
              const indent = isSubtask ? 'padding-left:1.5rem;' : '';
              const parentTitle = isSubtask && taskMap[t.parent_task_id]
                ? `↳ <span style="color:var(--color-text-muted);font-size:0.72rem">sous-tâche de #${t.parent_task_id}</span> `
                : '';
              const recurBadge = t.is_recurring
                ? `<span class="badge badge-info" title="Récurrente toutes les ${t.recurrence_minutes} min" style="margin-left:0.3rem;font-size:0.7rem">🔄 ${_recurrenceLabel(t.recurrence_minutes)}</span>`
                : '';
              const nextRun = (t.status === 'pending' && t.next_run_at)
                ? `<span style="color:var(--color-text-muted);font-size:0.72rem">${_nextRunLabel(t.next_run_at)}</span>`
                : (t.is_recurring && t.status === 'completed'
                  ? '<span style="color:var(--color-text-muted);font-size:0.72rem">—</span>'
                  : '<span style="color:var(--color-text-muted);font-size:0.72rem">—</span>');
              return `
              <tr style="cursor:pointer" onclick="showTaskDetail(${t.id})" data-task-id="${t.id}">
                <td style="color:var(--color-text-muted);font-size:0.75rem">${t.id}</td>
                <td style="${indent}">
                  <div style="font-weight:500">${parentTitle}${_escapeHtml(t.title)}${recurBadge}</div>
                  ${t.description ? `<div style="color:var(--color-text-muted);font-size:0.75rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px">${_escapeHtml(t.description.substring(0, 120))}${t.description.length > 120 ? '…' : ''}</div>` : ''}
                </td>
                <td>${_taskStatusBadge(t.status)}</td>
                <td>${nextRun}</td>
                <td style="color:var(--color-text-secondary);font-size:0.75rem">${_taskAge(t.updated_at)}</td>
                <td onclick="event.stopPropagation()">
                  <div style="display:flex;gap:0.25rem">
                    ${t.result ? `<button class="btn btn-secondary btn-sm" onclick="showTaskDetail(${t.id})">Résultat</button>` : ''}
                    ${['pending','paused','failed'].includes(t.status) ? `<button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id}, '${_escapeHtml(t.title.replace(/'/g, "\\'"))}')">Suppr.</button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p style="text-align:right;color:var(--color-text-muted);font-size:0.75rem;padding:0.5rem 0.25rem">
        ${all.length} tâche${all.length !== 1 ? 's' : ''} au total (50 dernières)
      </p>`;

  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">Erreur: ${_escapeHtml(err.message)}</div>`;
  }
}

// ── Détail / résultat d'une tâche ──────────────────────────────────────────────

async function showTaskDetail(taskId) {
  let task;
  try {
    const all = await Api.get('/support/tasks');
    task = all.find(t => t.id === taskId);
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
    return;
  }
  if (!task) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:660px;width:95%">
      <div class="modal-header">
        <h3 class="modal-title">Tâche #${task.id} — ${_escapeHtml(task.title)}</h3>
        <button class="modal-close" id="task-modal-close">&times;</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem">

        <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
          ${_taskStatusBadge(task.status)}
          ${task.is_recurring ? `<span class="badge badge-info">🔄 Récurrente — toutes les ${_recurrenceLabel(task.recurrence_minutes)} (${task.recurrence_minutes} min)</span>` : ''}
          ${task.parent_task_id ? `<span class="badge badge-warning">↳ Sous-tâche de #${task.parent_task_id}</span>` : ''}
          <span style="color:var(--color-text-muted);font-size:0.8rem">
            Créée ${_taskAge(task.created_at)} · Mise à jour ${_taskAge(task.updated_at)}
          </span>
          ${task.next_run_at ? `<span style="color:var(--color-text-muted);font-size:0.8rem">Prochaine exécution : ${_nextRunLabel(task.next_run_at)}</span>` : ''}
        </div>

        <div>
          <div style="font-size:0.75rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:0.4rem">Description</div>
          <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:0.75rem;font-size:0.85rem;white-space:pre-wrap;max-height:180px;overflow-y:auto">${_escapeHtml(task.description)}</div>
        </div>

        ${task.result ? `
        <div>
          <div style="font-size:0.75rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:0.4rem">Résultat</div>
          <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:0.75rem;font-size:0.85rem;white-space:pre-wrap;max-height:280px;overflow-y:auto;line-height:1.6">${_escapeHtml(task.result)}</div>
        </div>` : `
        <div style="color:var(--color-text-muted);font-size:0.85rem;padding:0.5rem 0">
          ${task.status === 'running' ? '⏳ Traitement en cours par Andy…' : 'Aucun résultat disponible.'}
        </div>`}

      </div>
      <div class="modal-footer">
        ${['pending','paused','failed'].includes(task.status) ? `
          <button class="btn btn-danger" id="task-modal-delete">Supprimer la tâche</button>` : ''}
        <button class="btn btn-secondary" id="task-modal-ok">Fermer</button>
      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#task-modal-close').addEventListener('click', close);
  modal.querySelector('#task-modal-ok').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  const delBtn = modal.querySelector('#task-modal-delete');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      close();
      await deleteTask(task.id, task.title);
    });
  }
}

// ── Créer une tâche ────────────────────────────────────────────────────────────

function showCreateTaskModal(recurringPreset = false) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px;width:95%">
      <div class="modal-header">
        <h3 class="modal-title">Nouvelle tâche de fond</h3>
        <button class="modal-close" id="ctask-close">&times;</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group">
          <label class="form-label">Titre <span style="color:var(--color-danger)">*</span></label>
          <input class="form-input" id="ctask-title" type="text" placeholder="Ex: Analyser les logs nginx" maxlength="200" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Description détaillée <span style="color:var(--color-danger)">*</span></label>
          <textarea class="form-input" id="ctask-desc" rows="5" placeholder="Décris précisément ce qu'Andy doit faire : serveur, node, vmid, commandes, objectif…" style="resize:vertical"></textarea>
          <div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.25rem">Plus la description est précise, mieux Andy pourra exécuter la tâche.</div>
        </div>
        <div class="form-group">
          <label class="form-label">ID tâche parente (sous-tâche)</label>
          <input class="form-input" id="ctask-parent" type="number" placeholder="Laisser vide si tâche principale" min="1">
          <div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.25rem">Optionnel — rattache cette tâche à une tâche existante.</div>
        </div>
        <div class="form-group form-group-toggle" style="padding:0.75rem;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
            <label class="form-label" style="margin:0">🔄 Tâche récurrente</label>
            <label class="toggle">
              <input type="checkbox" id="ctask-recurring">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="ctask-recurrence-opts" style="display:none">
            <label class="form-label" style="font-size:0.8rem">Intervalle de répétition</label>
            <select class="form-input" id="ctask-interval" style="margin-top:0.25rem">
              <option value="60">Toutes les heures (60 min)</option>
              <option value="360">Toutes les 6 heures</option>
              <option value="720">Toutes les 12 heures</option>
              <option value="1440" selected>Quotidien (24h)</option>
              <option value="10080">Hebdomadaire (7j)</option>
              <option value="custom">Personnalisé…</option>
            </select>
            <input class="form-input" id="ctask-interval-custom" type="number" min="5" placeholder="Minutes (min 5)" style="display:none;margin-top:0.5rem">
          </div>
        </div>
        <div id="ctask-error" class="alert alert-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="ctask-submit">Créer la tâche</button>
        <button class="btn btn-secondary" id="ctask-cancel">Annuler</button>
      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#ctask-close').addEventListener('click', close);
  modal.querySelector('#ctask-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Afficher/masquer options récurrence
  const recurChk = modal.querySelector('#ctask-recurring');
  const recurOpts = modal.querySelector('#ctask-recurrence-opts');
  if (recurringPreset) {
    recurChk.checked = true;
    recurOpts.style.display = '';
  }
  recurChk.addEventListener('change', () => {
    recurOpts.style.display = recurChk.checked ? '' : 'none';
  });
  const intervalSel = modal.querySelector('#ctask-interval');
  const intervalCustom = modal.querySelector('#ctask-interval-custom');
  intervalSel.addEventListener('change', () => {
    intervalCustom.style.display = intervalSel.value === 'custom' ? '' : 'none';
  });

  modal.querySelector('#ctask-submit').addEventListener('click', async () => {
    const title = modal.querySelector('#ctask-title').value.trim();
    const description = modal.querySelector('#ctask-desc').value.trim();
    const parentRaw = modal.querySelector('#ctask-parent').value.trim();
    const isRecurring = recurChk.checked;
    const errEl = modal.querySelector('#ctask-error');

    if (!title || !description) {
      errEl.textContent = 'Le titre et la description sont obligatoires.';
      errEl.style.display = '';
      return;
    }

    let recurrenceMinutes = null;
    if (isRecurring) {
      const sel = intervalSel.value;
      recurrenceMinutes = sel === 'custom'
        ? parseInt(intervalCustom.value, 10) || 60
        : parseInt(sel, 10);
      if (recurrenceMinutes < 5) recurrenceMinutes = 5;
    }

    const payload = { title, description, is_recurring: isRecurring };
    if (parentRaw) payload.parent_task_id = parseInt(parentRaw, 10);
    if (isRecurring) payload.recurrence_minutes = recurrenceMinutes;

    const btn = modal.querySelector('#ctask-submit');
    btn.disabled = true;
    btn.textContent = 'Création…';
    errEl.style.display = 'none';

    try {
      await Api.post('/support/tasks', payload);
      close();
      const msg = isRecurring
        ? `Tâche récurrente créée — toutes les ${_recurrenceLabel(recurrenceMinutes)}.`
        : 'Tâche créée — sera exécutée au prochain heartbeat.';
      showToast(msg, 'success');
      fetchTasks();
      fetchRecurringTasks();
      fetchHeartbeatStatus();
    } catch (err) {
      errEl.textContent = 'Erreur: ' + err.message;
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Créer la tâche';
    }
  });

  setTimeout(() => modal.querySelector('#ctask-title')?.focus(), 50);
}

// ── Supprimer une tâche ────────────────────────────────────────────────────────

async function deleteTask(id, title) {
  if (!confirm(`Supprimer la tâche "${title}" ?`)) return;
  try {
    await Api.delete(`/support/tasks/${id}`);
    showToast('Tâche supprimée.', 'success');
    fetchTasks();
    fetchRecurringTasks();
    fetchHeartbeatStatus();
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

async function deleteAllCompleted() {
  if (!confirm('Supprimer toutes les tâches terminées et échouées ?')) return;
  try {
    const all = await Api.get('/support/tasks');
    const toDelete = all.filter(t => t.status === 'completed' || t.status === 'failed');
    await Promise.all(toDelete.map(t => Api.delete(`/support/tasks/${t.id}`)));
    showToast(`${toDelete.length} tâche(s) supprimée(s).`, 'success');
    fetchTasks();
    fetchRecurringTasks();
    fetchHeartbeatStatus();
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }
}

// ── Auto-refresh ───────────────────────────────────────────────────────────────

function _startTasksAutoRefresh() {
  _stopTasksAutoRefresh();
  _tasksAutoRefresh = setInterval(async () => {
    const container = document.getElementById('tab-tasks');
    if (!container || container.style.display === 'none') {
      _stopTasksAutoRefresh();
      return;
    }
    try {
      const all = await Api.get('/support/tasks');
      const hasActive = all.some(t => t.status === 'running' || t.status === 'pending');
      // Rafraîchir silencieusement l'affichage
      fetchTasks();
      fetchRecurringTasks();
      if (hasActive) fetchHeartbeatStatus();
      // Arrêter si plus rien d'actif
      if (!hasActive) _stopTasksAutoRefresh();
    } catch (_) {}
  }, 15000);
}

function _stopTasksAutoRefresh() {
  if (_tasksAutoRefresh) {
    clearInterval(_tasksAutoRefresh);
    _tasksAutoRefresh = null;
  }
}
