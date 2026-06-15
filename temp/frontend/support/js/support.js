// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// dreamAI — Support chat Andy

'use strict';

// ── Storage keys ──────────────────────────────────────────────────────────
const KEY_ACCESS  = 'support_access_token';
const KEY_REFRESH = 'support_refresh_token';
const KEY_SESSION = 'support_session_id';
const KEY_EMAIL   = 'support_user_email';

// ── State ─────────────────────────────────────────────────────────────────
let _accessToken  = localStorage.getItem(KEY_ACCESS);
let _refreshToken = localStorage.getItem(KEY_REFRESH);
let _sessionId    = sessionStorage.getItem(KEY_SESSION);
let _userEmail    = localStorage.getItem(KEY_EMAIL);
let _tempToken    = null;
let _sending      = false;

// ── API client ────────────────────────────────────────────────────────────
async function _request(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_accessToken && !opts.noAuth) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !opts.noRefresh && _refreshToken) {
    const ok = await _doRefresh();
    if (ok) {
      headers['Authorization'] = `Bearer ${_accessToken}`;
      const retry = await fetch(`/api${path}`, {
        method, headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
      return _handleResponse(retry);
    } else {
      _clearTokens();
      showLoginView();
      return null;
    }
  }

  return _handleResponse(res);
}

async function _handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function _doRefresh() {
  if (!_refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    _setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

const Api = {
  get:  (path, opts)       => _request('GET',    path, null, opts),
  post: (path, body, opts) => _request('POST',   path, body, opts),
};

// ── Token helpers ─────────────────────────────────────────────────────────
function _setTokens(access, refresh, email) {
  _accessToken  = access;
  _refreshToken = refresh;
  localStorage.setItem(KEY_ACCESS,  access);
  if (refresh) localStorage.setItem(KEY_REFRESH, refresh);
  if (email) {
    _userEmail = email;
    localStorage.setItem(KEY_EMAIL, email);
  }
}

function _clearTokens() {
  _accessToken  = null;
  _refreshToken = null;
  _userEmail    = null;
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
  localStorage.removeItem(KEY_EMAIL);
  sessionStorage.removeItem(KEY_SESSION);
  _sessionId = null;
}

// ── UI helpers ────────────────────────────────────────────────────────────
function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="alert alert-error">${escHtml(msg)}</div>`;
}

function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '';
}

function setLoading(btn, loading, label = 'Chargement...') {
  if (!btn) return;
  btn.disabled = loading;
  btn._orig = btn._orig || btn.textContent;
  btn.textContent = loading ? label : btn._orig;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── View switching ────────────────────────────────────────────────────────
function showLoginView() {
  document.getElementById('view-login').style.display = 'flex';
  document.getElementById('view-chat').style.display  = 'none';
}

function showChatView() {
  document.getElementById('view-login').style.display = 'none';
  document.getElementById('view-chat').style.display  = 'flex';
  const sub = document.getElementById('user-subtitle');
  if (sub && _userEmail) sub.textContent = _userEmail;
}

function showStep(stepId) {
  ['step-login', 'step-totp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === stepId ? 'block' : 'none';
  });
}

// ── Login flow ────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('login-alert');
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;

  setLoading(btn, true, 'Connexion...');
  try {
    const data = await Api.post('/auth/login', { email, password: pass }, { noAuth: true });

    if (data.requires_totp === true) {
      _tempToken = data.temp_token;
      showStep('step-totp');
      document.getElementById('totp-code').focus();
    } else if (data.access_token) {
      _setTokens(data.access_token, data.refresh_token, email);
      showChatView();
    }
  } catch (err) {
    showAlert('login-alert', err.message);
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById('totp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('totp-alert');
  const btn  = e.target.querySelector('button[type=submit]');
  const code = document.getElementById('totp-code').value.trim();
  const email = document.getElementById('email').value.trim();

  setLoading(btn, true, 'Validation...');
  try {
    const data = await Api.post('/auth/totp/validate', {
      temp_token: _tempToken,
      totp_code:  code,
    }, { noAuth: true });

    _setTokens(data.access_token, data.refresh_token, email);
    showChatView();
  } catch (err) {
    showAlert('totp-alert', 'Code TOTP invalide');
    document.getElementById('totp-code').value = '';
    document.getElementById('totp-code').focus();
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById('back-to-login').addEventListener('click', () => {
  _tempToken = null;
  clearAlert('totp-alert');
  showStep('step-login');
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    if (_refreshToken) {
      await Api.post('/auth/logout', { refresh_token: _refreshToken }).catch(() => {});
    }
  } finally {
    _clearTokens();
    showStep('step-login');
    showLoginView();
    document.getElementById('password').value = '';
    document.getElementById('email').value = '';
    clearAlert('login-alert');
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────
function _appendMessage(role, text, id) {
  const container = document.getElementById('messages');

  // Remove welcome screen on first message
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const isAndy = role === 'andy';
  const wrap = document.createElement('div');
  wrap.className = `msg msg-${isAndy ? 'andy' : 'user'}`;
  if (id) wrap.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = isAndy ? '🤖' : '👤';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = fmtTime(new Date());

  body.appendChild(bubble);
  body.appendChild(time);
  wrap.appendChild(avatar);
  wrap.appendChild(body);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function _appendTyping() {
  const container = document.getElementById('messages');
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const wrap = document.createElement('div');
  wrap.className = 'msg msg-andy msg-typing';
  wrap.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = '🤖';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  body.appendChild(bubble);
  wrap.appendChild(avatar);
  wrap.appendChild(body);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function _removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendMessage(text) {
  if (!text.trim() || _sending) return;
  _sending = true;

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  _appendMessage('user', text);

  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
    sessionStorage.setItem(KEY_SESSION, _sessionId);
  }

  _appendTyping();

  try {
    const data = await Api.post('/support/chat', {
      message:    text,
      session_id: _sessionId,
      lang:       navigator.language?.slice(0, 2) || 'fr',
    });

    _removeTyping();
    if (data) {
      _sessionId = data.session_id;
      sessionStorage.setItem(KEY_SESSION, _sessionId);
      _appendMessage('andy', data.response);
    }
  } catch (err) {
    _removeTyping();
    if (err.status === 401) {
      _clearTokens();
      showLoginView();
    } else {
      _appendMessage('andy', 'Une erreur est survenue. Veuillez réessayer.');
    }
  } finally {
    _sending = false;
    sendBtn.disabled = false;
  }
}

// Chat form submit
document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('msg-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = '';
  sendMessage(text);
});

// Enter to send (Shift+Enter = newline)
document.getElementById('msg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const input = document.getElementById('msg-input');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = '';
    sendMessage(text);
  }
});

// Auto-resize textarea
document.getElementById('msg-input').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 140) + 'px';
});

// ── Init ──────────────────────────────────────────────────────────────────
if (_accessToken) {
  showChatView();
} else {
  showLoginView();
}
