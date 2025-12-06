// Fonction pour changer de langue
function toggleLanguage() {
    const langToggle = document.getElementById('langToggle');
    const langFlag = document.getElementById('langFlag');
    const langText = document.getElementById('langText');
    
    if (!langToggle || !window.app) return;
    
    const currentLang = window.app.i18n.currentLang;
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    
    // Change la langue dans l'application
    window.app.i18n.setLanguage(newLang);
    
    // Met à jour le bouton
    if (newLang === 'fr') {
        langFlag.textContent = '🇫🇷';
        langText.textContent = 'FR';
    } else {
        langFlag.textContent = '🇬🇧';
        langText.textContent = 'EN';
    }
    
    // Met à jour les textes de l'interface
    window.app.updateTimeoutInfo();
}

// Fonction pour ajouter un bouton d'édition aux messages utilisateur
function addEditButton(messageElement) {
    // Vérifie si c'est un message utilisateur
    if (!messageElement.classList.contains('user')) return;
    
    // Crée le bouton d'édition
    const editBtn = document.createElement('button');
    editBtn.className = 'message-edit-btn';
    editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    `;
    editBtn.title = 'Éditer ce message';
    
    // Ajoute le gestionnaire de clic
    editBtn.addEventListener('click', () => startEditMessage(messageElement));
    
    // Ajoute le bouton au message
    messageElement.appendChild(editBtn);
}

// Fonction pour commencer l'édition d'un message
function startEditMessage(messageElement) {
    // Vérifie si c'est le dernier message utilisateur
    const userMessages = document.querySelectorAll('.message.user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    if (messageElement !== lastUserMessage) {
        showNotification('Vous ne pouvez éditer que votre dernier message', 'warning');
        return;
    }
    
    // Met en pause le traitement si nécessaire
    if (window.app && window.app.isProcessing) {
        window.app.pauseProcessing();
    }
    
    // Récupère le contenu actuel
    const messageContent = messageElement.querySelector('.message-content');
    const currentText = messageContent.textContent.trim();
    
    // Passe en mode édition
    messageElement.classList.add('editing');
    
    // Crée l'interface d'édition
    const editContainer = document.createElement('div');
    editContainer.className = 'message-edit-container';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'message-edit-textarea';
    textarea.value = currentText;
    textarea.focus();
    
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'message-edit-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.onclick = () => cancelEdit(messageElement, messageContent);
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-save-btn';
    saveBtn.textContent = 'Enregistrer et envoyer';
    saveBtn.onclick = () => saveEdit(messageElement, textarea.value);
    
    actionsContainer.appendChild(cancelBtn);
    actionsContainer.appendChild(saveBtn);
    
    editContainer.appendChild(textarea);
    editContainer.appendChild(actionsContainer);
    
    // Remplace le contenu par l'éditeur
    messageContent.innerHTML = '';
    messageContent.appendChild(editContainer);
    
    // Auto-resize du textarea
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });
    
    // Raccourcis clavier
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });
}

// Fonction pour annuler l'édition
function cancelEdit(messageElement, originalContent) {
    messageElement.classList.remove('editing');
    
    // Restaure le contenu original
    const messageContent = messageElement.querySelector('.message-content');
    messageContent.innerHTML = originalContent.innerHTML;
    
    // Reprend le traitement si nécessaire
    if (window.app && window.app.isPaused) {
        window.app.resumeProcessing();
    }
}

// Fonction pour sauvegarder et envoyer le message édité
async function saveEdit(messageElement, newText) {
    if (!newText.trim()) {
        showNotification('Le message ne peut pas être vide', 'error');
        return;
    }
    
    // Sort du mode édition
    messageElement.classList.remove('editing');
    
    // Met à jour le contenu du message
    const messageContent = messageElement.querySelector('.message-content');
    messageContent.textContent = newText;
    
    // Supprime tous les messages après celui-ci
    let nextSibling = messageElement.nextElementSibling;
    while (nextSibling) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextElementSibling;
        toRemove.remove();
    }
    
    // Envoie le nouveau message
    if (window.app) {
        // Met à jour le dernier message utilisateur
        window.app.lastUserMessage = newText;
        
        // Réenvoie le message
        await window.app.sendMessage(newText, true); // true = message édité
    }
}

// Fonction pour mettre à jour les boutons d'édition lors de l'ajout de nouveaux messages
function updateEditButtons() {
    // Supprime tous les boutons d'édition existants
    document.querySelectorAll('.message-edit-btn').forEach(btn => btn.remove());
    
    // Ajoute le bouton d'édition uniquement au dernier message utilisateur
    const userMessages = document.querySelectorAll('.message.user');
    if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        addEditButton(lastUserMessage);
    }
}

// Fonction pour gérer la pause du traitement
function pauseProcessing() {
    if (!window.app || !window.app.isProcessing) return;
    
    window.app.isPaused = true;
    
    // Ajoute un indicateur visuel
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.textContent = '⏸️ Traitement en pause pour édition';
        statusMessage.classList.add('paused');
    }
    
    // Affiche une notification
    showNotification('Traitement mis en pause. Éditez votre message puis cliquez sur "Enregistrer et envoyer"', 'info');
}

// Fonction pour reprendre le traitement
function resumeProcessing() {
    if (!window.app || !window.app.isPaused) return;
    
    window.app.isPaused = false;
    
    // Retire l'indicateur visuel
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.textContent = 'Traitement en cours...';
        statusMessage.classList.remove('paused');
    }
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    // Couleurs selon le type
    const colors = {
        info: '#aeb910',
        success: '#10b940',
        warning: '#10b981',
        error: '#b92f10'
    };
    
    notification.style.background = colors[type] || colors.info;
    notification.style.color = 'white';
    
    document.body.appendChild(notification);
    
    // Supprime la notification après 5 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Ajoute le gestionnaire pour le bouton de langue
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
    
    // Observer pour détecter l'ajout de nouveaux messages
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    updateEditButtons();
                }
            });
        });
        
        observer.observe(messagesContainer, {
            childList: true,
            subtree: false
        });
        
        // Initialise les boutons d'édition
        updateEditButtons();
    }
});

// Export des fonctions pour utilisation dans l'application principale
window.messageEditor = {
    toggleLanguage,
    addEditButton,
    startEditMessage,
    cancelEdit,
    saveEdit,
    updateEditButtons,
    pauseProcessing,
    resumeProcessing
};