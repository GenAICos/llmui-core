// Copyright © Technologies Nexios TF Inc. — nexiostf.com
// LLMUI Core v1.0.0 - Andy Support Widget
// Author: François Chalut

/**
 * AndyWidget — Agent de support local alimenté par Ollama.
 * Bouton flottant accessible sur toutes les pages.
 */
class AndyWidget {
    constructor() {
        this.isOpen = false;
        this.sessionId = this._generateSessionId();
        this.history = [];
        this._init();
    }

    _generateSessionId() {
        return 'andy-' + crypto.getRandomValues(new Uint32Array(2)).join('-') + '-' + Date.now();
    }

    _getToken() {
        return localStorage.getItem('llmui_token') || sessionStorage.getItem('llmui_token') || '';
    }

    _init() {
        this.toggleBtn   = document.getElementById('andyToggleBtn');
        this.chatPanel   = document.getElementById('andyChatPanel');
        this.closeBtn    = document.getElementById('andyCloseBtn');
        this.sendBtn     = document.getElementById('andySendBtn');
        this.input       = document.getElementById('andyInput');
        this.messages    = document.getElementById('andyMessages');
        this.thinking    = document.getElementById('andyThinking');
        this.statusText  = document.getElementById('andyStatusText');
        this.escalateBtn = document.getElementById('andyEscalateBtn');
        this.humanBtn    = document.getElementById('andyHumanBtn');

        this.toggleBtn  ?.addEventListener('click', () => this._toggle());
        this.closeBtn   ?.addEventListener('click', () => this._close());
        this.sendBtn    ?.addEventListener('click', () => this._send());
        this.escalateBtn?.addEventListener('click', () => this._escalate());
        this.humanBtn   ?.addEventListener('click', () => this._escalate());

        this.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
        });

        this.input?.addEventListener('input', () => this._resize());
    }

    _toggle() { this.isOpen ? this._close() : this._open(); }

    _open() {
        this.isOpen = true;
        this.chatPanel?.classList.add('open');
        setTimeout(() => this.input?.focus(), 280);
    }

    _close() {
        this.isOpen = false;
        this.chatPanel?.classList.remove('open');
    }

    _resize() {
        if (!this.input) return;
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 80) + 'px';
    }

    _appendMessage(role, content) {
        if (!this.messages) return;

        const row = document.createElement('div');
        row.className = `andy-message ${role === 'user' ? 'andy-from-user' : 'andy-from-andy'}`;

        if (role === 'assistant') {
            const img = document.createElement('img');
            img.src = '../images/andyLogo.png';
            img.alt = 'Andy';
            img.className = 'andy-msg-avatar';
            row.appendChild(img);
        }

        const bubble = document.createElement('div');
        bubble.className = 'andy-msg-bubble';
        const p = document.createElement('p');
        p.textContent = content;
        bubble.appendChild(p);
        row.appendChild(bubble);

        this.messages.appendChild(row);
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    _setThinking(active) {
        if (active) {
            this.thinking?.classList.add('visible');
        } else {
            this.thinking?.classList.remove('visible');
        }

        if (this.statusText) {
            this.statusText.textContent = active ? 'Andy réfléchit...' : 'Prêt à vous aider';
        }

        if (this.sendBtn) this.sendBtn.disabled = active;
        if (this.input)   this.input.disabled   = active;
    }

    async _send() {
        if (!this.input) return;
        const text = this.input.value.trim();
        if (!text) return;

        this.input.value = '';
        this.input.style.height = 'auto';

        this._appendMessage('user', text);
        this.history.push({ role: 'user', content: text });

        this._setThinking(true);

        try {
            const res = await fetch('/api/support/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._getToken()}`
                },
                body: JSON.stringify({
                    message: text,
                    session_id: this.sessionId,
                    history: this.history.slice(-10)
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const reply = data.response || data.message || "Je n'ai pas pu obtenir une réponse.";

            this.history.push({ role: 'assistant', content: reply });
            this._appendMessage('assistant', reply);

        } catch {
            this._appendMessage(
                'assistant',
                "Je rencontre une difficulté technique. Veuillez réessayer ou cliquer sur « Parler à un humain »."
            );
        } finally {
            this._setThinking(false);
        }
    }

    _escalate() {
        this._appendMessage(
            'assistant',
            "Je transfère votre demande à notre équipe de support. Un agent vous répondra dans les plus brefs délais. Vous pouvez aussi nous écrire à support@nexiostf.com."
        );
        if (this.humanBtn)    { this.humanBtn.disabled    = true; this.humanBtn.style.opacity    = '0.45'; }
        if (this.escalateBtn) { this.escalateBtn.disabled = true; this.escalateBtn.style.opacity = '0.45'; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.andyWidget = new AndyWidget();
});
