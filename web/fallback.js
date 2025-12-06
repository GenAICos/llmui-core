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
        warning.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #f59e0b;
                color: white;
                padding: 0.5rem;
                text-align: center;
                font-weight: bold;
                z-index: 10000;
                animation: slideDown 0.3s ease;
            ">
                ⚠️ Mode hors ligne - Le serveur ne répond pas
            </div>
        `;
        document.body.appendChild(warning);

        // Ajouter l'animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    hideOfflineWarning() {
        const warning = document.getElementById('offline-warning');
        if (warning) {
            warning.remove();
        }
    }
}

window.fallbackManager = new FallbackManager();