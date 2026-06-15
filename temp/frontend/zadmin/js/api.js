// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// Tous droits réservés
// Client API centralisé avec auto-refresh JWT

const API_BASE = '/api';

const Api = {
  _accessToken: null,
  _refreshToken: null,

  init() {
    this._accessToken = localStorage.getItem('access_token');
    this._refreshToken = localStorage.getItem('refresh_token');
  },

  setTokens(accessToken, refreshToken) {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  },

  clearTokens() {
    this._accessToken = null;
    this._refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async _request(method, path, body, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._accessToken && !opts.noAuth) {
      headers['Authorization'] = `Bearer ${this._accessToken}`;
    }
    if (opts.token) {
      headers['Authorization'] = `Bearer ${opts.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !opts.noRefresh && this._refreshToken) {
      const refreshed = await this._refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this._accessToken}`;
        const retry = await fetch(`${API_BASE}${path}`, {
          method, headers, body: body ? JSON.stringify(body) : undefined,
        });
        return this._handleResponse(retry);
      } else {
        this.clearTokens();
        window.location.href = '/zadmin/';
        return null;
      }
    }

    return this._handleResponse(res);
  },

  async _handleResponse(res) {
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let detail = data.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(e => e.msg || JSON.stringify(e)).join(' — ');
      }
      const err = new Error(detail || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  async _refreshTokens() {
    if (!this._refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this._refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  },

  get(path, opts) { return this._request('GET', path, null, opts); },
  post(path, body, opts) { return this._request('POST', path, body, opts); },
  put(path, body, opts) { return this._request('PUT', path, body, opts); },
  patch(path, body, opts) { return this._request('PATCH', path, body, opts); },
  delete(path, opts) { return this._request('DELETE', path, null, opts); },
};

Api.init();

// Utilitaires UI globaux
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '';
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Chargement...' : btn.dataset.originalText;
}
