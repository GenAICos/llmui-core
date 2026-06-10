/**
 * LLMUI Core v2.0 - Custom Dialog System
 * Author: François Chalut
 * Website: https://llmui.org
 * 
 * Système de dialogues personnalisés élégants
 * Remplace alert/confirm SAUF pour l'encodage UTF-8
 */

// ============================================
// DIALOG SYSTEM
// ============================================

/**
 * Affiche une boîte de dialogue personnalisée
 * @param {Object} options - Configuration du dialogue
 * @param {string} options.title - Titre du dialogue
 * @param {string} options.message - Message à afficher
 * @param {string} options.type - Type: 'info', 'success', 'warning', 'error', 'confirm'
 * @param {Function} options.onConfirm - Callback si confirmé (pour type confirm)
 * @param {Function} options.onCancel - Callback si annulé (pour type confirm)
 */
function showDialog(options) {
    const {
        title = 'Information',
        message = '',
        type = 'info',
        onConfirm = () => {},
        onCancel = () => {}
    } = options;

    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    // Créer le dialogue
    const dialog = document.createElement('div');
    dialog.className = `custom-dialog dialog-${type}`;
    
    // Icône selon le type
    const icons = {
        info: '&#8505;',      // ℹ
        success: '&#10004;',  // ✔
        warning: '&#9888;',   // ⚠
        error: '&#10008;',    // ✘
        confirm: '&#10067;'   // ❓
    };
    
    // Construction du HTML
    dialog.innerHTML = `
        <div class="dialog-header">
            <div class="dialog-icon">${icons[type]}</div>
            <h3 class="dialog-title">${title}</h3>
        </div>
        <div class="dialog-body">
            <p class="dialog-message">${message}</p>
        </div>
        <div class="dialog-footer">
            ${type === 'confirm' 
                ? '<button class="dialog-btn dialog-btn-cancel">Annuler</button><button class="dialog-btn dialog-btn-confirm">Confirmer</button>'
                : '<button class="dialog-btn dialog-btn-ok">OK</button>'
            }
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animation d'entrée
    setTimeout(() => {
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);

    // Fonction de fermeture
    const closeDialog = (confirmed = false) => {
        overlay.style.opacity = '0';
        dialog.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            overlay.remove();
            if (type === 'confirm') {
                if (confirmed) {
                    onConfirm();
                } else {
                    onCancel();
                }
            }
        }, 300);
    };

    // Gestionnaires d'événements
    if (type === 'confirm') {
        const btnConfirm = dialog.querySelector('.dialog-btn-confirm');
        const btnCancel = dialog.querySelector('.dialog-btn-cancel');
        
        btnConfirm.addEventListener('click', () => closeDialog(true));
        btnCancel.addEventListener('click', () => closeDialog(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog(false);
        });
    } else {
        const btnOk = dialog.querySelector('.dialog-btn-ok');
        btnOk.addEventListener('click', () => closeDialog());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });
    }

    // Échap pour fermer
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog(false);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================
// WRAPPERS POUR FACILITER L'UTILISATION
// ============================================

/**
 * Affiche un dialogue d'information
 */
function showInfoDialog(title, message) {
    showDialog({ title, message, type: 'info' });
}

/**
 * Affiche un dialogue de succès
 */
function showSuccessDialog(title, message) {
    showDialog({ title, message, type: 'success' });
}

/**
 * Affiche un dialogue d'avertissement
 */
function showWarningDialog(title, message) {
    showDialog({ title, message, type: 'warning' });
}

/**
 * Affiche un dialogue d'erreur
 */
function showErrorDialog(title, message) {
    showDialog({ title, message, type: 'error' });
}

/**
 * Affiche un dialogue de confirmation
 * @returns {Promise<boolean>} true si confirmé, false sinon
 */
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        showDialog({
            title,
            message,
            type: 'confirm',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

// ============================================
// REMPLACEMENT DES ALERTS/CONFIRMS EXISTANTS
// ============================================

/**
 * Remplace les showNotification pour les cas où on veut un dialogue modal
 */
function showModalNotification(message, type = 'info') {
    const titles = {
        info: 'Information',
        success: 'Succès',
        warning: 'Attention',
        error: 'Erreur'
    };
    
    showDialog({
        title: titles[type] || titles.info,
        message: message,
        type: type
    });
}

// ============================================
// EXEMPLES D'UTILISATION DANS TON CODE
// ============================================

/**
 * Exemple 1: Confirmer avant de supprimer un fichier
 */
async function confirmFileRemoval(filename) {
    const confirmed = await showConfirmDialog(
        'Supprimer le fichier',
        `Êtes-vous sûr de vouloir supprimer "${filename}" ?`
    );
    
    if (confirmed) {
        // Supprimer le fichier
    }
}

/**
 * Exemple 2: Afficher une erreur de fichier trop lourd
 */
function showFileTooLargeError(filename, size) {
    showErrorDialog(
        'Fichier trop volumineux',
        `Le fichier "${filename}" (${formatFileSize(size)}) dépasse la limite autorisée.`
    );
}

/**
 * Exemple 3: Confirmer avant de vider la conversation
 */
async function confirmClearConversation() {
    const confirmed = await showConfirmDialog(
        'Nouvelle conversation',
        'Voulez-vous vraiment effacer toute la conversation actuelle ?'
    );
    
    return confirmed;
}

