// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Logique d'authentification /zadmin

let _tempToken = null;
let _forcedTotpSetup = false; // true = flux forcé (vs premier login)

function showStep(stepId) {
  const steps = ['step-login', 'step-totp', 'step-create-password', 'step-setup-totp', 'step-recovery-codes'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === stepId ? 'block' : 'none';
  });
}

// Step 1: Login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('login-alert');
  const btn = document.getElementById('login-btn');
  setLoading(btn, true);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const data = await Api.post('/auth/login', { email, password }, { noAuth: true });

    if (data.requires_totp === true) {
      // TOTP déjà configuré — saisie du code
      _tempToken = data.temp_token;
      _forcedTotpSetup = false;
      showStep('step-totp');

    } else if (data.requires_totp_setup === true) {
      // TOTP obligatoire par config mais pas encore configuré
      _tempToken = data.temp_token;
      _forcedTotpSetup = true;
      try {
        const totpData = await Api.post('/auth/totp/setup-forced', { temp_token: _tempToken }, { noAuth: true });
        _renderQrCode(totpData.qr_code_svg, totpData.manual_key);
        showStep('step-setup-totp');
      } catch (setupErr) {
        showAlert('login-alert', setupErr.message || 'Erreur lors de la génération du QR TOTP.');
      }

    } else if (data.requires_totp === false && data.temp_token) {
      // Première connexion — création mot de passe
      _tempToken = data.temp_token;
      _forcedTotpSetup = false;
      showStep('step-create-password');

    } else if (data.access_token) {
      Api.setTokens(data.access_token, data.refresh_token);
      window.location.href = '/zadmin/app.html';
    }
  } catch (err) {
    showAlert('login-alert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

// Step 2: TOTP validation (code déjà existant)
document.getElementById('totp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('totp-alert');
  const code = document.getElementById('totp-code').value;

  try {
    const data = await Api.post('/auth/totp/validate', {
      temp_token: _tempToken,
      totp_code: code,
    }, { noAuth: true });

    Api.setTokens(data.access_token, data.refresh_token);
    window.location.href = '/zadmin/app.html';
  } catch (err) {
    showAlert('totp-alert', 'Code TOTP invalide');
  }
});

document.getElementById('back-to-login')?.addEventListener('click', () => {
  _tempToken = null;
  _forcedTotpSetup = false;
  showStep('step-login');
});

// Step 3: Create password (première connexion)
document.getElementById('create-pwd-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('pwd-alert');
  const pwd = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;

  if (pwd !== confirm) {
    showAlert('pwd-alert', 'Les mots de passe ne correspondent pas');
    return;
  }

  try {
    await Api.post('/auth/password/create', { password: pwd, password_confirm: confirm }, { token: _tempToken });

    const loginData = await Api.post('/auth/login', {
      email: document.getElementById('email')?.value || '',
      password: pwd,
    }, { noAuth: true });

    let totpData;
    if (loginData.access_token) {
      Api.setTokens(loginData.access_token, loginData.refresh_token);
      totpData = await Api.post('/auth/totp/setup', {});
    } else if (loginData.requires_totp_setup) {
      _tempToken = loginData.temp_token;
      _forcedTotpSetup = true;
      totpData = await Api.post('/auth/totp/setup-forced', { temp_token: _tempToken }, { noAuth: true });
    } else {
      totpData = await Api.post('/auth/totp/setup', {});
    }
    _renderQrCode(totpData.qr_code_svg, totpData.manual_key);
    showStep('step-setup-totp');
  } catch (err) {
    showAlert('pwd-alert', err.message);
  }
});

// Step 4: Verify TOTP setup (premier login OU forcé)
document.getElementById('setup-totp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('setup-totp-alert');
  const code = document.getElementById('setup-totp-code').value;

  try {
    if (_forcedTotpSetup) {
      // Flux forcé : tokens + codes de récupération en une seule requête
      const data = await Api.post('/auth/totp/verify-forced', {
        temp_token: _tempToken,
        totp_code: code,
      }, { noAuth: true });
      Api.setTokens(data.access_token, data.refresh_token);
      _showRecoveryCodes(data.recovery_codes);
    } else {
      // Flux premier login : tokens déjà définis, on récupère juste les codes
      const data = await Api.post('/auth/totp/verify', { totp_code: code });
      _showRecoveryCodes(data.recovery_codes);
    }
  } catch (err) {
    showAlert('setup-totp-alert', 'Code invalide');
  }
});

// Step 5: Finish setup
document.getElementById('finish-setup')?.addEventListener('click', () => {
  window.location.href = '/zadmin/app.html';
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function _renderQrCode(qrData, manualKey) {
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  if (qrData) {
    if (qrData.startsWith('data:image/png;base64,')) {
      const img = document.createElement('img');
      img.src = qrData;
      img.style.cssText = 'width:200px;height:200px;display:block;margin:0 auto';
      container.appendChild(img);
    } else {
      const svgDoc = new DOMParser().parseFromString(qrData, 'image/svg+xml');
      const svgEl = svgDoc.documentElement;
      if (svgEl && svgEl.tagName.toLowerCase() === 'svg') {
        container.appendChild(document.importNode(svgEl, true));
      }
    }
  }
  document.getElementById('totp-manual-key').textContent = manualKey;
}

function _showRecoveryCodes(codes) {
  const list = document.getElementById('recovery-codes-list');
  list.innerHTML = codes.map(c => `<div class="recovery-code">${c}</div>`).join('');
  showStep('step-recovery-codes');
}

// Redirection si déjà connecté
if (Api._accessToken) {
  window.location.href = '/zadmin/app.html';
}
