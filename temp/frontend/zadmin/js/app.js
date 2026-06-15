// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Application principale /zadmin — routing des onglets

const TAB_TITLES = {
  dashboard: 'Dashboard',
  users: 'Utilisateurs',
  roles: 'Groupes & Rôles',
  llms: 'LLMs',
  ollama: 'OLLAMA HOST',
  rag: 'RAG',
  logs: 'Logs',
  config: 'Paramètres',
  git: 'git Connector',
  pipeline: 'Pipeline',
  tasks: 'Tâches Andy',
  workspaces: 'Workspaces Andy',
  lora: 'LoRA Training',
  remote_hosts: 'Hôtes distants',
  greetings: 'Messages de bienvenue',
  skills: 'Andy Skills',
  feedback: 'Feedback & Bugs',
};

const TAB_LOADERS = {};
let _currentTab = null;

function registerTab(tabId, loadFn) {
  TAB_LOADERS[tabId] = loadFn;
}

function switchTab(tabId) {
  if (_currentTab === tabId) return;
  _currentTab = tabId;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.style.display = 'none';
  });

  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.style.display = 'block';

  document.getElementById('page-title').textContent = TAB_TITLES[tabId] || tabId;

  if (TAB_LOADERS[tabId]) {
    TAB_LOADERS[tabId](tabEl);
  }
}

// Navigation
document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await Api.post('/auth/logout', { refresh_token: refreshToken });
    }
  } catch (_) {}
  Api.clearTokens();
  window.location.href = '/zadmin/';
});

// Vérification de l'authentification
async function init() {
  if (!Api._accessToken) {
    window.location.href = '/zadmin/';
    return;
  }

  // Peupler le sélecteur de langue depuis I18n (source de vérité)
  const headerLang = document.getElementById('header-lang');
  if (headerLang) {
    headerLang.innerHTML = I18n.availableLangs()
      .map(l => `<option value="${l}">${l.toUpperCase()}</option>`)
      .join('');
  }

  // Charger le profil utilisateur (email + langue) — endpoint non-admin
  let userEmail = '';
  try {
    const profile = await Api.get('/user/me');
    userEmail = profile?.email || '';
    if (headerLang && profile?.preferred_lang) {
      headerLang.value = profile.preferred_lang;
      I18n.setLang(profile.preferred_lang);
    } else {
      const stored = I18n.getLang();
      if (headerLang) headerLang.value = stored;
    }
  } catch (err) {
    if (err.status === 401) {
      Api.clearTokens();
      window.location.href = '/zadmin/';
      return;
    }
    // Appliquer la langue stockée même en cas d'erreur
    const stored = I18n.getLang();
    if (headerLang) headerLang.value = stored;
  }

  // Vérifier les droits admin
  try {
    await Api.get('/admin/dashboard/metrics');
  } catch (err) {
    if (err.status === 401) {
      Api.clearTokens();
      window.location.href = '/zadmin/';
      return;
    }
    if (err.status === 403) {
      // Authentifié mais pas admin — rediriger vers l'interface principale
      window.location.href = '/';
      return;
    }
    // Autres erreurs (réseau, 5xx) : continuer quand même
  }

  document.getElementById('header-user-email').textContent = userEmail;
  document.getElementById('sidebar-user-email').textContent = userEmail;

  // Vérifier le statut TOTP de l'admin connecté
  try {
    const totpStatus = await Api.get('/user/me/totp');
    if (!totpStatus?.is_active) {
      const btn = document.getElementById('totp-setup-btn');
      if (btn) btn.style.display = 'inline-flex';
    }
  } catch (_) {}

  document.getElementById('totp-setup-btn')?.addEventListener('click', showTotpSetupModal);

  switchTab('dashboard');
}

async function showTotpSetupModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h3 class="modal-title">Configurer mon TOTP</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="totp-modal-step-qr">
        <div class="alert alert-info" style="margin-bottom:1rem">
          Scannez ce QR code avec Aegis, Google Authenticator, ou toute app compatible TOTP.
        </div>
        <div id="totp-modal-qr" style="text-align:center;margin:1rem 0"></div>
        <div style="text-align:center;margin-bottom:1rem">
          <p style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:0.25rem">Ou entrez manuellement :</p>
          <code id="totp-modal-key" style="font-size:0.875rem;word-break:break-all"></code>
        </div>
        <div id="totp-modal-alert"></div>
        <form id="totp-modal-form">
          <div class="form-group">
            <label>Code de vérification (6 chiffres)</label>
            <input type="text" id="totp-modal-code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
              placeholder="000000" style="text-align:center;letter-spacing:0.3em;font-size:1.25rem" required>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
            <button type="submit" class="btn btn-primary">Activer</button>
          </div>
        </form>
      </div>
      <div id="totp-modal-step-codes" style="display:none">
        <div class="alert alert-error" style="margin-bottom:1rem">
          <strong>IMPORTANT :</strong> Copiez ces codes maintenant. Ils ne seront plus affichés.
        </div>
        <div id="totp-modal-codes" style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.5rem"></div>
        <button class="btn btn-primary" style="width:100%" onclick="this.closest('.modal-overlay').remove();document.getElementById('totp-setup-btn').style.display='none'">
          J'ai copié mes codes — Fermer
        </button>
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(modal);

  try {
    const totpData = await Api.post('/user/me/totp/setup');
    const container = modal.querySelector('#totp-modal-qr');
    const svgDoc = new DOMParser().parseFromString(totpData.qr_code_svg, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    if (svgEl && svgEl.tagName.toLowerCase() === 'svg') {
      container.appendChild(document.importNode(svgEl, true));
    }
    modal.querySelector('#totp-modal-key').textContent = totpData.manual_key;
  } catch (err) {
    showAlert('totp-modal-alert', err.message || 'Impossible de générer le QR TOTP.');
    return;
  }

  modal.querySelector('#totp-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('totp-modal-alert');
    const code = modal.querySelector('#totp-modal-code').value;
    try {
      const data = await Api.post('/user/me/totp/verify', { totp_code: code });
      modal.querySelector('#totp-modal-step-qr').style.display = 'none';
      const codesEl = modal.querySelector('#totp-modal-codes');
      codesEl.innerHTML = data.recovery_codes.map(c => `<div class="recovery-code">${c}</div>`).join('');
      modal.querySelector('#totp-modal-step-codes').style.display = 'block';
      showToast('TOTP activé avec succès', 'success');
    } catch (_) {
      showAlert('totp-modal-alert', 'Code invalide — réessayez.');
    }
  });
}

// Sélecteur de langue dans le header
document.getElementById('header-lang')?.addEventListener('change', async (e) => {
  const lang = e.target.value;
  I18n.setLang(lang);
  try {
    await Api.patch('/user/me', { preferred_lang: lang });
  } catch (_) {}
});

// Thème sombre/clair
function _updateThemeIcons(theme) {
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  if (sun) sun.style.display = theme === 'dark' ? 'inline' : 'none';
  if (moon) moon.style.display = theme === 'dark' ? 'none' : 'inline';
}

(function initTheme() {
  const stored = localStorage.getItem('admin_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  _updateThemeIcons(theme);
})();

document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('admin_theme', next);
  _updateThemeIcons(next);
});

init();
