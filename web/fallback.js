// fallback.js - Gestion des erreurs de connexion
class FallbackManager {
    constructor() {
        this.isServerOnline = true;
        this.lastOnlineCheck = Date.now();
    }

    async checkServerStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('/api/health', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            this.isServerOnline = response.ok;
            this.lastOnlineCheck = Date.now();
            return this.isServerOnline;
        } catch (error) {
            this.isServerOnline = false;
            this.lastOnlineCheck = Date.now();
            return false;
        }
    }

    showOfflineWarning() {
        const existingWarning = document.getElementById('offline-warning');
        if (existingWarning) return;

        const warning = document.createElement('div');
        warning.id = 'offline-warning';
        warning.className = 'offline-warning';
        warning.textContent = '⚠️ Mode hors ligne - Le serveur ne répond pas';
        document.body.appendChild(warning);
    }

    hideOfflineWarning() {
        const warning = document.getElementById('offline-warning');
        if (warning) {
            warning.remove();
        }
    }
}

window.fallbackManager = new FallbackManager();