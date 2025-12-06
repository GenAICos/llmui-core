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
    
    // Couleurs selon le type
    const colors = {
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        confirm: '#8b5cf6'
    };

    // Construction du HTML
    dialog.innerHTML = `
        <div class="dialog-header" style="border-bottom: 2px solid ${colors[type]}">
            <div class="dialog-icon" style="background: ${colors[type]}">${icons[type]}</div>
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
        console.log('Fichier supprimé');
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

// ============================================
// STYLES CSS À AJOUTER
// ============================================

/**
 * Injecte automatiquement les styles nécessaires
 */
function injectDialogStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Dialog Overlay */
        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        /* Dialog Container */
        .custom-dialog {
            background: var(--color-surface, #1f2937);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 90%;
            overflow: hidden;
            transform: scale(0.9);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Dialog Header */
        .dialog-header {
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .dialog-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            flex-shrink: 0;
        }

        .dialog-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-text, #f3f4f6);
        }

        /* Dialog Body */
        .dialog-body {
            padding: 1.5rem;
            padding-top: 0;
        }

        .dialog-message {
            margin: 0;
            font-size: 1rem;
            line-height: 1.6;
            color: var(--color-text-secondary, #9ca3af);
        }

        /* Dialog Footer */
        .dialog-footer {
            padding: 1.5rem;
            padding-top: 1rem;
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Dialog Buttons */
        .dialog-btn {
            padding: 0.625rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .dialog-btn-ok,
        .dialog-btn-confirm {
            background: var(--color-primary, #3b82f6);
            color: white;
        }

        .dialog-btn-ok:hover,
        .dialog-btn-confirm:hover {
            background: var(--color-primary-hover, #2563eb);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .dialog-btn-cancel {
            background: var(--color-secondary, rgba(255, 255, 255, 0.1));
            color: var(--color-text, #f3f4f6);
        }

        .dialog-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        /* Type-specific dialog styles */
        .dialog-error .dialog-header {
            background: rgba(239, 68, 68, 0.1);
        }

        .dialog-success .dialog-header {
            background: rgba(16, 185, 129, 0.1);
        }

        .dialog-warning .dialog-header {
            background: rgba(245, 158, 11, 0.1);
        }

        .dialog-info .dialog-header {
            background: rgba(59, 130, 246, 0.1);
        }

        .dialog-confirm .dialog-header {
            background: rgba(139, 92, 246, 0.1);
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: light) {
            .custom-dialog {
                background: white;
            }
            
            .dialog-title {
                color: #1f2937;
            }
            
            .dialog-message {
                color: #4b5563;
            }
            
            .dialog-footer {
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }
        }
    `;
    document.head.appendChild(style);
}

// Injection automatique au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDialogStyles);
} else {
    injectDialogStyles();
}
