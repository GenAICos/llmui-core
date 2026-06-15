// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Onglet RAG

registerTab('rag', (container) => loadRAG(container));

async function loadRAG(container) {
  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-subtab="rag-collections">Collections</button>
      <button class="tab-btn" data-subtab="rag-query">Test de requête</button>
    </div>
    <div id="subtab-rag-collections"></div>
    <div id="subtab-rag-query" style="display:none"></div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('[id^="subtab-rag-"]').forEach(el => el.style.display = 'none');
      document.getElementById(`subtab-${btn.dataset.subtab}`).style.display = 'block';
      if (btn.dataset.subtab === 'rag-collections') loadCollections();
      if (btn.dataset.subtab === 'rag-query') loadRAGQuery();
    });
  });

  loadCollections();
}

async function loadCollections() {
  const container = document.getElementById('subtab-rag-collections');
  if (!container) return;
  container.innerHTML = '<div class="spinner" style="display:block;margin:2rem auto"></div>';

  try {
    const collections = await Api.get('/admin/rag/collections/');
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showCreateCollectionModal()">+ Nouvelle collection</button>
        <button class="btn btn-secondary" onclick="loadCollections()">Actualiser</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
        ${collections.map(c => `
          <div class="card">
            <div class="card-header">
              <strong>${c.name}</strong>
              <button class="btn btn-danger btn-sm" onclick="deleteCollection(${c.id}, '${c.name}')">✕</button>
            </div>
            <p style="font-size:0.875rem;color:var(--color-text-secondary)">${c.description || 'Aucune description'}</p>
            <div style="margin-top:0.75rem;font-size:0.75rem;color:var(--color-text-muted)">
              <div>${c.document_count} document(s)</div>
              <div>Modèle: ${c.embedding_model}</div>
              <div>Chunk: ${c.chunk_size} / overlap: ${c.chunk_overlap}</div>
            </div>
            <div style="margin-top:0.75rem;display:flex;gap:0.5rem">
              <button class="btn btn-secondary btn-sm" onclick="showDocumentsModal(${c.id}, '${c.name}')">Documents</button>
              <button class="btn btn-primary btn-sm" onclick="showIngestModal(${c.id})">Ingérer</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function loadRAGQuery() {
  const container = document.getElementById('subtab-rag-query');
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <h3 class="card-title" style="margin-bottom:1rem">Test de requête RAG</h3>
      <div class="form-group">
        <label>Collection</label>
        <select id="rag-query-collection"><option>Chargement...</option></select>
      </div>
      <div class="form-group">
        <label>Requête</label>
        <textarea id="rag-query-text" rows="3" placeholder="Entrez votre question..."></textarea>
      </div>
      <button class="btn btn-primary" id="rag-query-btn">Rechercher</button>
      <div id="rag-query-results" style="margin-top:1rem"></div>
    </div>
  `;

  Api.get('/admin/rag/collections/').then(cols => {
    const sel = document.getElementById('rag-query-collection');
    sel.innerHTML = cols.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });

  document.getElementById('rag-query-btn').addEventListener('click', async () => {
    const collId = parseInt(document.getElementById('rag-query-collection').value);
    const query = document.getElementById('rag-query-text').value;
    const btn = document.getElementById('rag-query-btn');
    setLoading(btn, true);

    try {
      const results = await Api.post('/admin/rag/query', { collection_id: collId, query, top_k: 5 });
      const el = document.getElementById('rag-query-results');
      el.innerHTML = results.length === 0 ? '<p style="color:var(--color-text-muted)">Aucun résultat.</p>' :
        results.map((r, i) => `
          <div class="card" style="margin-bottom:0.75rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
              <strong style="font-size:0.875rem">${i+1}. ${r.document_title}</strong>
              <span class="badge badge-info">Score: ${(r.score * 100).toFixed(0)}%</span>
            </div>
            <p style="font-size:0.875rem">${r.content.substring(0, 300)}${r.content.length > 300 ? '...' : ''}</p>
          </div>
        `).join('');
    } catch (err) {
      document.getElementById('rag-query-results').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      setLoading(btn, false);
    }
  });
}

function showCreateCollectionModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Nouvelle collection RAG</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="create-coll-alert"></div>
      <form id="create-coll-form">
        <div class="form-group"><label>Nom *</label><input name="name" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        <div class="form-group"><label>Modèle d'embedding</label><input name="embedding_model" value="nomic-embed-text"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>Taille chunk</label><input name="chunk_size" type="number" value="500"></div>
          <div class="form-group"><label>Overlap</label><input name="chunk_overlap" type="number" value="50"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#create-coll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post('/admin/rag/collections/', { name: fd.get('name'), description: fd.get('description'), embedding_model: fd.get('embedding_model'), chunk_size: parseInt(fd.get('chunk_size')), chunk_overlap: parseInt(fd.get('chunk_overlap')) });
      modal.remove();
      showToast('Collection créée', 'success');
      loadCollections();
    } catch (err) {
      showAlert('create-coll-alert', err.message);
    }
  });
}

function showIngestModal(collectionId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Ingérer un document</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="ingest-alert"></div>
      <form id="ingest-form">
        <div class="form-group"><label>Titre *</label><input name="title" required></div>
        <div class="form-group">
          <label>Type de source</label>
          <select name="source_type" id="source-type-sel">
            <option value="text">Texte direct</option>
            <option value="url">URL</option>
          </select>
        </div>
        <div class="form-group" id="content-group"><label>Contenu</label><textarea name="content" rows="5"></textarea></div>
        <div class="form-group" id="url-group" style="display:none"><label>URL source</label><input name="source_url" placeholder="https://..."></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
          <button type="submit" class="btn btn-primary">Ingérer</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  modal.querySelector('#source-type-sel').addEventListener('change', (e) => {
    const isUrl = e.target.value === 'url';
    modal.querySelector('#content-group').style.display = isUrl ? 'none' : 'block';
    modal.querySelector('#url-group').style.display = isUrl ? 'block' : 'none';
  });

  modal.querySelector('#ingest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.post('/admin/rag/ingest', { collection_id: collectionId, title: fd.get('title'), source_type: fd.get('source_type'), content: fd.get('content') || null, source_url: fd.get('source_url') || null });
      modal.remove();
      showToast('Document ingéré', 'success');
      loadCollections();
    } catch (err) {
      showAlert('ingest-alert', err.message);
    }
  });
}

async function deleteCollection(id, name) {
  if (!confirm(`Supprimer la collection "${name}" et tous ses documents ?`)) return;
  try {
    await Api.delete(`/admin/rag/collections/${id}`);
    showToast('Collection supprimée', 'success');
    loadCollections();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showDocumentsModal(collId, name) {
  const docs = await Api.get(`/admin/rag/collections/${collId}/documents`);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <h3 class="modal-title">Documents — ${name}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Titre</th><th>Type</th><th>Statut</th><th>Chunks</th></tr></thead>
          <tbody>
            ${docs.map(d => `
              <tr>
                <td>${d.title}</td>
                <td><span class="badge badge-info">${d.source_type}</span></td>
                <td><span class="badge badge-${d.status === 'indexed' ? 'success' : d.status === 'error' ? 'danger' : 'warning'}">${d.status}</span></td>
                <td>${d.chunk_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);
}
