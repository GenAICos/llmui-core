/*
 * LLMUI Core v0.5.0 - UI Methods
 * Author: François Chalut
 * Website: https://llmui.org
 * 
 * CORRECTIONS v0.5.0:
 * - Liens de téléchargement markdown → HTML cliquables
 * - FIX: Clipboard compatible HTTP/HTTPS (fallback pour HTTP)
 */

// ============================================================================
// CLIPBOARD UTILITY - Compatible HTTP/HTTPS
// ============================================================================

/**
 * Copie du texte dans le presse-papier
 * Compatible HTTP et HTTPS avec fallback
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>} - true si succès
 */
function copyToClipboardFallback(text) {
    // Méthode 1: Essayer l'API Clipboard moderne (HTTPS uniquement)
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text)
            .then(() => true)
            .catch(err => {
                console.warn('Clipboard API failed, using fallback:', err);
                return fallbackCopyMethod(text);
            });
    }
    
    // Méthode 2: Fallback pour HTTP
    return Promise.resolve(fallbackCopyMethod(text));
}

/**
 * Méthode de copie fallback utilisant execCommand (deprecated mais fonctionne)
 * @param {string} text - Texte à copier
 * @returns {boolean} - true si succès
 */
function fallbackCopyMethod(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Rendre invisible
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // Essayer de copier
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return successful;
    } catch (err) {
        console.error('Fallback copy failed:', err);
        return false;
    }
}

// ============================================================================
// UI METHODS
// ============================================================================

// Méthodes UI attachées à LLMUIApp
LLMUIApp.prototype.setupEventListeners = function() {
    // Language toggle
    document.getElementById('langToggle')?.addEventListener('click', () => {
        const newLang = this.i18n.currentLang === 'fr' ? 'en' : 'fr';
        this.i18n.setLanguage(newLang);
        this.updateTimeoutInfo();
    });
    
    // Mode switching
    document.getElementById('modeSimple')?.addEventListener('click', () => {
        this.switchMode('simple');
    });
    
    document.getElementById('modeConsensus')?.addEventListener('click', () => {
        this.switchMode('consensus');
    });
    
    // FAB Toggle Panel
    document.getElementById('fabTogglePanel')?.addEventListener('click', () => {
        this.toggleConfigPanel();
    });
    
    // Send button
    document.getElementById('sendButton')?.addEventListener('click', () => {
        const prompt = document.getElementById('promptInput')?.value;
        this.sendMessage(prompt);
    });
    
    // Prompt input - Enter to send
    const promptInput = document.getElementById('promptInput');
    promptInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const prompt = e.target.value;
            this.sendMessage(prompt);
        }
    });
    
    // File upload
    document.getElementById('fileUploadBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput')?.click();
    });
    
    document.getElementById('fileInput')?.addEventListener('change', (e) => {
        this.handleFileSelect(e.target.files);
    });
    
    // Drag and drop
    const messagesContainer = document.getElementById('messagesContainer');
    const chatPanel = document.getElementById('chatPanel');
    
    const dropZone = chatPanel || messagesContainer;
    
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        });
        
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files);
            }
        });
    }
    
    // FAB buttons
    document.getElementById('fabInfo')?.addEventListener('click', () => this.showInfo());
    document.getElementById('fabRecommended')?.addEventListener('click', () => this.selectRecommended());
    document.getElementById('fabClear')?.addEventListener('click', () => this.clearSelection());
    
    // Info modal
    document.getElementById('infoBtn')?.addEventListener('click', () => this.showInfo());
    document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay')?.addEventListener('click', () => this.closeModal());
    
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    
    // New conversation button
    document.getElementById('newConversationBtn')?.addEventListener('click', () => this.clearConversation());
    
    // Timeout level selector
    document.getElementById('timeoutSelect')?.addEventListener('change', (e) => {
        this.currentTimeoutLevel = e.target.value;
        this.updateTimeoutInfo();
    });
    
    // Consensus threshold
    document.getElementById('threshold')?.addEventListener('input', (e) => {
        const thresholdValue = document.getElementById('thresholdValue');
        if (thresholdValue) {
            thresholdValue.textContent = e.target.value;
        }
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            this.applyPreset(preset);
        });
    });
    
    this.setupFileChipEventDelegation();
    
    // ✨ AUTO-FOCUS : Quand on clique dans la zone de chat
    if (chatPanel) {
        chatPanel.addEventListener('click', (e) => {
            // Ne pas focus si on clique sur un bouton, lien ou input
            if (!e.target.closest('button, a, input, select, textarea')) {
                const promptInput = document.getElementById('promptInput');
                if (promptInput && !this.isProcessing) {
                    promptInput.focus();
                }
            }
        });
    }
    
    // ✨ AUTO-FOCUS : Quand on clique dans la zone de messages
    if (messagesContainer) {
        messagesContainer.addEventListener('click', (e) => {
            // Ne pas focus si on clique sur un élément interactif
            if (!e.target.closest('button, a, input, select, textarea')) {
                const promptInput = document.getElementById('promptInput');
                if (promptInput && !this.isProcessing) {
                    promptInput.focus();
                }
            }
        });
    }
};

LLMUIApp.prototype.toggleConfigPanel = function() {
    const configPanel = document.getElementById('configPanel');
    const mainContent = document.getElementById('mainContent');
    const fabBtn = document.getElementById('fabTogglePanel');
    const panelText = fabBtn?.querySelector('.panel-text');
    
    if (configPanel && mainContent && fabBtn) {
        configPanel.classList.toggle('collapsed');
        mainContent.classList.toggle('panel-collapsed');
        
        // Mettre à jour le texte selon la langue
        const isCollapsed = configPanel.classList.contains('collapsed');
        if (panelText) {
            if (this.i18n.currentLang === 'fr') {
                panelText.textContent = isCollapsed ? 'Ouvrir le panneau' : 'Fermer le panneau';
            } else {
                panelText.textContent = isCollapsed ? 'Open panel' : 'Close panel';
            }
        }
        fabBtn.title = panelText ? panelText.textContent : '';
    }
};

LLMUIApp.prototype.switchMode = function(mode) {
    this.currentMode = mode;
    
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.classList.toggle('active', btn.id === (mode === 'simple' ? 'modeSimple' : 'modeConsensus'));
    });
    
    const modeDesc = document.getElementById('modeDescription');
    if (modeDesc) {
        if (mode === 'simple') {
            modeDesc.innerHTML = '💡 Mode simple : Conversation directe avec un seul modèle (plus rapide)';
            modeDesc.style.background = 'rgba(234, 179, 8, 0.1)';
            modeDesc.style.borderLeft = '3px solid #eab308';
        } else {
            modeDesc.innerHTML = '💡 Mode consensus : Plusieurs modèles analysent et fusionnent leurs réponses (plus robuste)';
            modeDesc.style.background = 'rgba(6, 182, 212, 0.1)';
            modeDesc.style.borderLeft = '3px solid #06b6d4';
        }
    }
    
    const simpleModelCard = document.getElementById('simpleModelCard');
    const workerModelsCard = document.getElementById('workerModelsCard');
    const mergerCard = document.getElementById('mergerCard');
    
    if (simpleModelCard) {
        simpleModelCard.style.display = mode === 'simple' ? 'block' : 'none';
    }
    if (workerModelsCard) {
        workerModelsCard.style.display = mode === 'consensus' ? 'block' : 'none';
    }
    if (mergerCard) {
        mergerCard.style.display = mode === 'consensus' ? 'block' : 'none';
    }
    
    this.updateTimeoutInfo();
};

LLMUIApp.prototype.populateModelSelects = function() {
    const simpleSelect = document.getElementById('simpleModelSelect');
    if (simpleSelect) {
        simpleSelect.innerHTML = this.availableModels
            .map(model => `<option value="${model}">${model}</option>`)
            .join('');
    }
    
    const workerDiv = document.getElementById('workerModels');
    if (workerDiv) {
        workerDiv.innerHTML = this.availableModels
            .map(model => `
                <label class="model-checkbox">
                    <input type="checkbox" value="${model}" class="worker-checkbox">
                    <span>${model}</span>
                </label>
            `).join('');
    }
    
    const mergerSelect = document.getElementById('mergerSelect');
    if (mergerSelect) {
        mergerSelect.innerHTML = this.availableModels
            .map(model => `<option value="${model}">${model}</option>`)
            .join('');
    }
    
    const modelsCount = document.getElementById('modelsCount');
    if (modelsCount) {
        modelsCount.textContent = this.availableModels.length;
    }
    const welcomeModelsCount = document.getElementById('welcomeModelsCount');
    if (welcomeModelsCount) {
        welcomeModelsCount.textContent = this.availableModels.length;
    }
};

LLMUIApp.prototype.updateFileChips = function() {
    const container = document.getElementById('fileChipsContainer');
    if (!container) return;
    
    if (this.selectedFiles.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = this.selectedFiles.map((file, index) => `
        <div class="file-chip" data-file-index="${index}">
            <span class="file-chip-name">${file.name}</span>
            <button class="file-chip-remove" type="button" title="Supprimer">×</button>
        </div>
    `).join('');
};

LLMUIApp.prototype.setupFileChipEventDelegation = function() {
    const container = document.getElementById('fileChipsContainer');
    if (!container) return;
    
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('file-chip-remove')) {
            e.preventDefault();
            e.stopPropagation();
            
            const chip = e.target.closest('.file-chip');
            if (chip) {
                const index = parseInt(chip.getAttribute('data-file-index'));
                if (!isNaN(index)) {
                    this.removeFile(index);
                }
            }
        }
    });
};

LLMUIApp.prototype.removeFile = function(index) {
    if (index >= 0 && index < this.selectedFiles.length) {
        const removedFile = this.selectedFiles.splice(index, 1)[0];
        showNotification(this.i18n.t('file_removed', {filename: removedFile.name}), 'info');
        this.updateFileChips();
        this.updateFileInfo();
    }
};

LLMUIApp.prototype.updateFileInfo = function() {
    const fileInfo = document.getElementById('fileInfo');
    if (!fileInfo) return;
    
    if (this.selectedFiles.length === 0) {
        fileInfo.textContent = '';
    } else {
        const totalSize = this.selectedFiles.reduce((sum, f) => sum + f.size, 0);
        fileInfo.textContent = `${this.selectedFiles.length} fichier(s) - ${formatFileSize(totalSize)}`;
    }
};

LLMUIApp.prototype.addMessage = function(type, content, files = []) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    if (type === 'user') {
        messageDiv.className = 'message user';
    } else if (type === 'assistant') {
        messageDiv.className = 'message assistant';
    } else {
        messageDiv.className = 'message llmui';
    }
    
    // En-tête pour les messages utilisateur/assistant
    if (type === 'user' || type === 'assistant') {
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const messageRole = document.createElement('div');
        messageRole.className = 'message-role';
        messageRole.textContent = type === 'user' ? '👤 Vous' : '🤖 Assistant';
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // ✨ BOUTON COPIER pour les messages assistant
        if (type === 'assistant') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-message-btn';
            copyBtn.title = 'Copier la réponse';
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            `;
            
            // Event listener pour copier
            copyBtn.addEventListener('click', function() {
                const messageContent = messageDiv.querySelector('.message-content');
                if (messageContent) {
                    // Extraire le texte sans HTML
                    const textToCopy = messageContent.innerText || messageContent.textContent;
                    
                    // Copier dans le presse-papier (compatible HTTP/HTTPS)
                    copyToClipboardFallback(textToCopy).then(function(success) {
                        if (success) {
                            // Feedback visuel
                            copyBtn.classList.add('copied');
                            copyBtn.innerHTML = `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            `;
                            
                            // Notification
                            showNotification('Réponse copiée !', 'success');
                        
                        // Retour à l'icône normale après 2s
                        setTimeout(function() {
                            copyBtn.classList.remove('copied');
                            copyBtn.innerHTML = `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            `;
                        }, 2000);
                    }).catch(function(err) {
                        console.error('Erreur lors de la copie:', err);
                        showNotification('Erreur lors de la copie', 'error');
                    });
                }
            }); // <-- ICI : Cette parenthèse fermante manquait
            
            messageHeader.appendChild(messageRole);
            messageHeader.appendChild(copyBtn);
            messageHeader.appendChild(messageTime);
        } else {
            messageHeader.appendChild(messageRole);
            messageHeader.appendChild(messageTime);
        }
        
        messageDiv.appendChild(messageHeader);
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (type === 'user') {
        messageContent.textContent = content;
        
        // Fichiers joints
        if (files && files.length > 0) {
            const filesInfo = document.createElement('div');
            filesInfo.className = 'message-files-info';
            filesInfo.innerHTML = `📎 ${files.length} fichier(s) joint(s): ${files.map(f => f.name).join(', ')}`;
            messageContent.appendChild(filesInfo);
        }
        
    } else if (type === 'assistant') {
        if (content === this.i18n.t('processing') || content === this.i18n.t('processing_consensus')) {
            messageContent.innerHTML = `
                <div class="processing-indicator">
                    <div class="spinner"></div>
                    <span>${content}</span>
                </div>
            `;
        } else {
            messageContent.innerHTML = this.formatContent(content);
        }
    } else {
        // Message de bienvenue formaté exactement comme screenshot
        messageContent.innerHTML = `
            <span class="welcome-message-text">${content}</span>
            <div class="consensus-info">
                🤖 Système initialisé<br>
                📊 <span id="welcomeModelsCount">${this.availableModels.length}</span> modèles disponibles<br>
                ⚡ Prêt pour le consensus<br>
                🔒 Session authentifiée
            </div>
        `;
    }
    
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
};

LLMUIApp.prototype.updateMessage = function(messageDiv, content, model) {
    if (!messageDiv) return;
    
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        messageContent.innerHTML = this.formatContent(content);
        
        // Badge du modèle
        if (model) {
            const header = messageDiv.querySelector('.message-header');
            if (header) {
                // Vérifier si le badge existe déjà 
                let modelSpan = header.querySelector('.message-model');
                if (!modelSpan) {
                    modelSpan = document.createElement('span');
                    modelSpan.className = 'message-model';
                    header.appendChild(modelSpan);
                }
                modelSpan.textContent = model;
            }
        }
    }
};

LLMUIApp.prototype.updateConsensusMessage = function(messageDiv, data) {
    if (!messageDiv || !data) return;
    
    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
        let html = '';
        
        if (data.response) {
            html = this.formatContent(data.response);
        }
        
        // Ajouter des métadonnées du consensus si disponibles
        if (data.worker_count) {
            html += `<div class="consensus-metadata">
                <small>🧠 Consensus formé par ${data.worker_count} modèles + ${data.merger_model || 'merger'}</small>
            </div>`;
        }
        
        contentDiv.innerHTML = html;
    }
};

// ✅ CORRECTION v0.5.0: Liens de téléchargement markdown → HTML
LLMUIApp.prototype.formatContent = function(content) {
    if (!content) return '';
    
    // Remplacer les retours à ligne par des <br>
    let formatted = content.replace(/\n/g, '<br>');
    
    // ✅ CORRECTION: Convertir les liens markdown de téléchargement en HTML cliquables
    formatted = formatted.replace(
        /\[([^\]]+)\]\((\/download\/[a-f0-9-]+)\)/gi,
        '<a href="$2" class="download-link" download>$1</a>'
    );
    
    formatted = formatted.replace(
        /\[([^\]]+)\]\((download\/[a-f0-9-]+)\)/gi,
        '<a href="/$2" class="download-link" download>$1</a>'
    );
    
    // Formater le markdown simple
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    return formatted;
};

LLMUIApp.prototype.toggleTheme = function() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = isLight ? '🌙' : '☀️';
    }
};

LLMUIApp.prototype.showInfo = function() {
    const modal = document.getElementById('infoModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        modal.classList.add('active');
        overlay.classList.add('active');
    }
};

LLMUIApp.prototype.closeModal = function() {
    const modal = document.getElementById('infoModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        modal.classList.remove('active');
        overlay.classList.remove('active');
    }
};

LLMUIApp.prototype.updateUI = function() {
    const sendBtn = document.getElementById('sendButton');
    
    if (sendBtn) {
        sendBtn.disabled = this.isProcessing;
    }
};

// ============================================================================
// MÉTHODES CORRIGÉES POUR SUPPORT DE TOUS LES FICHIERS
// ============================================================================

LLMUIApp.prototype.handleFileSelect = function(files) {
    if (!files || files.length === 0) return;
    
    console.log('Fichiers sélectionnés:', files);
    
    // Extensions autorisées
    const allowedExtensions = [
        '.txt', '.md', '.markdown', '.rst',
        '.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.xml', '.yaml', '.yml',
        '.html', '.htm', '.css', '.scss', '.sass', '.less',
        '.sh', '.bash', '.zsh', '.fish',
        '.c', '.cpp', '.h', '.hpp', '.java', '.cs', '.go', '.rs', '.rb', '.php',
        '.swift', '.kt', '.scala', '.r', '.m', '.sql',
        '.conf', '.config', '.ini', '.toml', '.env',
        '.csv', '.tsv', '.json', '.xml',
        '.docx', '.doc', '.xlsx', '.xls', '.pdf', '.odt', '.ods', '.rtf',
        '.png', '.jpg', '.jpeg'
    ];
    
    let filesAdded = 0;
    
    for (const file of files) {
        const fileName = file.name || 'sans_nom';
        const fileExt = '.' + fileName.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            showNotification(this.i18n.t('invalid_extension', {filename: fileName}), 'error');
            continue;
        }
        
        if (file.size > this.MAX_FILE_SIZE) {
            showNotification(this.i18n.t('file_too_large', {
                filename: fileName,
                size: formatFileSize(file.size)
            }), 'error');
            continue;
        }
        
        const totalSizeAfterAdd = this.selectedFiles.reduce((sum, f) => sum + f.size, 0) + file.size;
        if (totalSizeAfterAdd > this.MAX_TOTAL_FILES_SIZE) {
            showNotification(this.i18n.t('total_size_exceeded', {
                total: formatFileSize(totalSizeAfterAdd)
            }), 'error');
            break;
        }
        
        this.selectedFiles.push(file);
        filesAdded++;
    }
    
    if (filesAdded > 0) {
        this.updateFileChips();
        this.updateFileInfo();
        showNotification(`${filesAdded} fichier(s) ajouté(s)`, 'success');
    }
};

LLMUIApp.prototype.clearInput = function() {
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.value = '';
    }
};

LLMUIApp.prototype.clearFiles = function() {
    this.selectedFiles = [];
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    this.updateFileChips();
    this.updateFileInfo();
};

LLMUIApp.prototype.getSelectedWorkers = function() {
    const checkboxes = document.querySelectorAll('.worker-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
};

LLMUIApp.prototype.clearConversation = function() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="message llmui">
                <div class="message-content">
                    👋 Bienvenue dans LLMUI Core ! Je suis prêt à traiter vos requêtes.
                    <div class="consensus-info">
                        🤖 Système initialisé<br>
                        📊 <span id="welcomeModelsCount">${this.availableModels.length}</span> modèles disponibles<br>
                        ⚡ Prêt pour le consensus<br>
                        🔒 Session authentifiée
                    </div>
                </div>
            </div>
        `;
    }
    this.clearInput();
    this.clearFiles();
    this.lastUserMessage = null;
    showNotification(this.i18n.t('cleared_conversation'), 'info');
    
    // ✨ Remettre le focus après avoir effacé
    this.focusPromptInput();
};

LLMUIApp.prototype.selectRecommended = function() {
    document.querySelectorAll('.worker-checkbox').forEach(cb => cb.checked = false);
    
    const recommended = this.availableModels.slice(0, Math.min(3, this.availableModels.length));
    recommended.forEach(model => {
        const checkbox = document.querySelector(`.worker-checkbox[value="${model}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    showNotification('Sélection recommandée appliquée', 'success');
};

LLMUIApp.prototype.clearSelection = function() {
    document.querySelectorAll('.worker-checkbox').forEach(cb => cb.checked = false);
    showNotification('Sélection effacée', 'info');
};
