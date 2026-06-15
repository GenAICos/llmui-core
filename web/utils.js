/*
 * LLMUI Core v2.0 - Utilities
 * Author: François Chalut
 * Website: https://llmui.org
 */

function generateSecureSessionId() {
    if (window.crypto && window.crypto.randomUUID) {
        return 'session_' + crypto.randomUUID();
    } else {
        // Fallback for older browsers
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return 'session_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
    return `${minutes}min`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// FONCTION AMÉLIORÉE - CORRIGE LE BUG DES NOTIFICATIONS
function showNotification(message, type = 'info') {
    // Create container if it doesn't exist
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles
    const colors = {
        info: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
    };
    
    notification.classList.add('toast');
    notification.style.background = colors[type] || colors.info;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}