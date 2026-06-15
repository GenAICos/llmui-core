// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Andy Support Chat — application principale

'use strict';

const API = '/api';

// ── État ─────────────────────────────────────────────────────────────────────

let _accessToken   = localStorage.getItem('access_token')  || null;
let _refreshToken  = localStorage.getItem('refresh_token') || null;
let _userEmail     = localStorage.getItem('user_email')    || null;
let _sessionId     = null;
let _lang          = localStorage.getItem('chat_lang')     || navigator.language?.split('-')[0] || 'fr';
let _tempToken     = null;
let _tempEmail     = null;

// ── Utilitaires auth ─────────────────────────────────────────────────────────

function _saveTokens(access, refresh) {
  _accessToken  = access;
  _refreshToken = refresh;
  localStorage.setItem('access_token',  access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

function _clearTokens() {
  _accessToken = _refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_email');
}

async function _apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token || _accessToken;
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

// ── Vues ─────────────────────────────────────────────────────────────────────

function showLogin(step = 'credentials') {
  document.getElementById('view-login').style.display = 'flex';
  document.getElementById('view-chat').style.display  = 'none';
  ['credentials', 'totp', 'newpwd'].forEach(s => {
    document.getElementById(`login-step-${s}`).style.display = s === step ? 'block' : 'none';
  });
}

function showChat() {
  document.getElementById('view-login').style.display = 'none';
  document.getElementById('view-chat').style.display  = 'flex';
  _applyLang(_lang);
}

// ── Login : Step 1 — email + password ────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('login-alert');
  alertEl.style.display = 'none';
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'Connexion…';

  try {
    const data = await _apiPost('/auth/login', { email, password: pwd });

    if (data.access_token) {
      _saveTokens(data.access_token, data.refresh_token);
      localStorage.setItem('user_email', email);
      _userEmail = email;
      showChat();
    } else if (data.requires_totp === true) {
      _tempToken = data.temp_token;
      _tempEmail = email;
      showLogin('totp');
    } else if (data.requires_totp === false && data.temp_token) {
      // First login — create password
      _tempToken = data.temp_token;
      _tempEmail = email;
      showLogin('newpwd');
    }
  } catch (err) {
    alertEl.textContent = err.message;
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

// ── Login : Step 2 — TOTP ────────────────────────────────────────────────────

document.getElementById('totp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('totp-alert');
  alertEl.style.display = 'none';
  const btn  = document.getElementById('totp-btn');
  const code = document.getElementById('totp-code').value.trim();

  btn.disabled = true;
  btn.textContent = 'Validation…';

  try {
    const data = await _apiPost('/auth/totp/validate', { temp_token: _tempToken, totp_code: code });
    _saveTokens(data.access_token, data.refresh_token);
    if (_tempEmail) { localStorage.setItem('user_email', _tempEmail); _userEmail = _tempEmail; }
    showChat();
  } catch {
    alertEl.textContent = 'Code TOTP invalide.';
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Valider';
  }
});

document.getElementById('totp-back').addEventListener('click', () => {
  _tempToken = null;
  showLogin('credentials');
});

// ── Login : Step 3 — Create password ─────────────────────────────────────────

document.getElementById('newpwd-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('newpwd-alert');
  alertEl.style.display = 'none';
  const btn  = document.getElementById('newpwd-btn');
  const pwd  = document.getElementById('new-password').value;
  const conf = document.getElementById('confirm-password').value;

  if (pwd !== conf) {
    alertEl.textContent = 'Les mots de passe ne correspondent pas.';
    alertEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enregistrement…';

  try {
    await _apiPost('/auth/password/create', { password: pwd, password_confirm: conf }, _tempToken);
    // Re-login with new password
    const data = await _apiPost('/auth/login', { email: _tempEmail, password: pwd });
    if (data.access_token) {
      _saveTokens(data.access_token, data.refresh_token);
      if (_tempEmail) { localStorage.setItem('user_email', _tempEmail); _userEmail = _tempEmail; }
      showChat();
    } else {
      alertEl.textContent = 'Erreur inattendue — veuillez réessayer.';
      alertEl.style.display = 'block';
    }
  } catch (err) {
    alertEl.textContent = err.message;
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
});

// ── Chat : messages ──────────────────────────────────────────────────────────

function _fmtTime(d) {
  return d.toLocaleTimeString(_lang, { hour: '2-digit', minute: '2-digit' });
}

function _appendMsg(role, text) {
  const container = document.getElementById('chat-messages');
  const isUser = role === 'user';

  const wrapper = document.createElement('div');
  wrapper.className = `msg ${isUser ? 'user' : 'andy'}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = isUser ? (_userEmail?.[0]?.toUpperCase() || 'M') : 'A';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = `${_fmtTime(new Date())}${isUser ? ' · Moi' : ''}`;

  body.appendChild(bubble);
  body.appendChild(meta);
  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  return wrapper;
}

function _appendTyping() {
  const container = document.getElementById('chat-messages');
  const wrapper = document.createElement('div');
  wrapper.className = 'msg andy';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = 'A';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  body.appendChild(bubble);
  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  return wrapper;
}

// ── Chat : envoi ─────────────────────────────────────────────────────────────

async function _sendMessage(text) {
  const input  = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  if (!text.trim()) return;

  input.value = '';
  input.style.height = 'auto';
  input.disabled = true;
  btnSend.disabled = true;

  _appendMsg('user', text);
  const typingEl = _appendTyping();

  try {
    const payload = { message: text, lang: _lang };
    if (_sessionId) payload.session_id = _sessionId;
    const data = await _apiPost('/support/chat', payload);
    _sessionId = data.session_id;
    typingEl.remove();
    _appendMsg('andy', data.response);
  } catch (err) {
    typingEl.remove();
    _appendMsg('andy', `Erreur : ${err.message}`);
  } finally {
    input.disabled = false;
    btnSend.disabled = false;
    input.focus();
  }
}

// ── Chat : contrôles ─────────────────────────────────────────────────────────

// Auto-resize textarea
document.getElementById('chat-input').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

// Enter → send, Shift+Enter → newline
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    _sendMessage(document.getElementById('chat-input').value);
  }
});

document.getElementById('btn-send').addEventListener('click', () => {
  _sendMessage(document.getElementById('chat-input').value);
});

// Nouvelle conversation
document.getElementById('btn-new-conv').addEventListener('click', () => {
  _sessionId = null;
  document.getElementById('chat-messages').innerHTML = '';
});

// Effacer conversation
document.getElementById('btn-clear-chat').addEventListener('click', () => {
  _sessionId = null;
  document.getElementById('chat-messages').innerHTML = '';
});

// Déconnexion via Panel Admin (géré par /zadmin) — pas de logout ici
// (le bouton Panel Admin est juste un lien)

// ── Langue ────────────────────────────────────────────────────────────────────

function _applyLang(lang) {
  _lang = lang;
  localStorage.setItem('chat_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.getElementById('lang-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (btn) _applyLang(btn.dataset.lang);
});

// ── Init ──────────────────────────────────────────────────────────────────────

if (_accessToken) {
  showChat();
} else {
  showLogin('credentials');
}
