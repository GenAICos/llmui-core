/*
 * LLMUI Core v2.0.1 - Main App Logic
 * Author: Francois Chalut
 * Website: https://llmui.org
 * 
 * CORRECTIONS v2.0.1:
 * - Rappel automatique de langue dans sendSimple() et sendConsensus()
 */

class LLMUIApp {
    constructor() {
        this.i18n = new I18n();
        this.currentMode = 'simple';
        this.selectedFiles = [];
        this.sessionId = generateSecureSessionId();
        this.lastUserMessage = null;
        this.isProcessing = false;
        this.availableModels = [];
        this.timeoutLevels = {};
        this.currentTimeoutLevel = 'medium';
        this.statsFailCount = 0;
        this.maxStatsRetries = 3;
        this.statsRefreshInterval = null;
        
        // File upload limits
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        this.MAX_TOTAL_FILES_SIZE = 20 * 1024 * 1024;
        
        this.init();
    }
    
    async init() {
        console.log('Initialisation de LLMUIApp...');
        this.i18n.updateUI();
        this.setupEventListeners();
        await this.loadModels();
        await this.loadTimeoutLevels();
        await this.loadStats();
        this.updateUI();
        this.startStatsRefresh();
        
        // Auto-focus sur le prompt au chargement
        this.focusPromptInput();
    }
    
    /**
     * Met le focus sur l'input de prompt
     * Appelé au chargement et après chaque envoi de message
     */
    focusPromptInput() {
        setTimeout(() => {
            const promptInput = document.getElementById('promptInput');
            if (promptInput) {
                promptInput.focus();
                console.log('âœ… Focus mis sur le prompt');
            }
        }, 100);
    }
    
    async sendMessage(prompt, isEdited = false) {
        console.log('sendMessage appelé:', {
            prompt: prompt ? prompt.substring(0, 50) + '...' : 'null',
            isEdited: isEdited,
            currentMode: this.currentMode
        });
        
        if (!prompt || prompt.trim() === '') {
            console.log('Message vide, abandon');
            return;
        }
        
        if (!isEdited) {
            const userFiles = [...this.selectedFiles];
            this.addMessage('user', prompt, userFiles);
        }
        
        this.lastUserMessage = {
            text: prompt,
            files: [...this.selectedFiles]
        };
        
        if (this.currentMode === 'simple') {
            await this.sendSimple(prompt);
        } else {
            await this.sendConsensus(prompt);
        }
        
        if (!isEdited) {
            this.clearInput();
            this.clearFiles();
        }
        
        // Remettre le focus après l'envoi
        this.focusPromptInput();
    }
    
    async sendSimple(prompt) {
        const modelSelect = document.getElementById('simpleModelSelect');
        const model = modelSelect ? modelSelect.value : null;
        
        if (!model) {
            showNotification(this.i18n.t('select_model'), 'warning');
            return;
        }
        
        this.isProcessing = true;
        this.updateUI();
        
        const messageDiv = this.addMessage('assistant', this.i18n.t('processing'), []);
         
        let fullPrompt = prompt;
        
        // Ajouter le contenu des fichiers au prompt
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            console.log('Lecture des fichiers joints:', this.selectedFiles.length);
            const filesContent = [];
            
            for (const file of this.selectedFiles) {
                try {
                    const content = await readFileContent(file);
                    filesContent.push(`=== Fichier: ${file.name} ===\n${content}\n=== Fin du fichier ===`);
                    console.log(`Fichier lu: ${file.name} (${content.length} caractères)`);
                } catch (error) {
                    console.error('Erreur lecture fichier:', error);
                    filesContent.push(`=== Fichier: ${file.name} ===\n[ERREUR: Impossible de lire le fichier]\n=== Fin du fichier ===`);
                }
            }
            
            fullPrompt = `Fichiers joints (${this.selectedFiles.length}):\n${filesContent.join('\n\n')}\n\nQuestion: ${prompt}`;
            console.log('Prompt avec fichiers:', fullPrompt.substring(0, 200) + '...');
        }
        
        try {
            console.log('Envoi requÃªte simple Ã  l API (timeout backend: ' + this.currentTimeoutLevel + ') avec fichiers:', this.selectedFiles?.length || 0);
            
            const response = await fetch('/api/simple-generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    model: model,
                    prompt: fullPrompt,
                    session_id: this.sessionId,
                    timeout_level: this.currentTimeoutLevel,
                    language: this.i18n.currentLang
                })
            });
            
            console.log('Réponse API reçue:', response.status);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Données API reçues:', data);
            
            if (data.success) {
                console.log('âœ… Réponse LLM reçue avec succès');
                this.updateMessage(messageDiv, data.response, data.model || model);
                showNotification('Réponse reçue du LLM', 'success');
            } else {
                throw new Error(data.error || 'Erreur inconnue du serveur');
            }
            
        } catch (error) {
            console.error('Erreur sendSimple:', error);
            
            let errorMessage = 'Erreur de communication';
            let notificationMessage = 'Erreur';
            
            if (error.name === 'AbortError') {
                errorMessage = `â±ï¸ **Timeout backend dépassé**\n\n` +
                             `Le modèle LLM a dépassé le timeout configuré (${this.currentTimeoutLevel}).\n\n` +
                             `**Solutions :**\n` +
                             `â€¢ Choisir un timeout plus long\n` +
                             `â€¢ Utiliser un modèle plus rapide\n` +
                             `â€¢ Simplifier votre requÃªte`;
                notificationMessage = `Timeout backend (${this.currentTimeoutLevel})`;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'ðŸŒ Impossible de contacter le serveur';
                notificationMessage = 'Serveur inaccessible';
            } else if (error.message.includes('timeout')) {
                errorMessage = `â±ï¸ **Timeout dépassé (${this.currentTimeoutLevel})**\n\n` +
                             `Le modèle LLM a mis trop de temps Ã  répondre.\n\n` +
                             `**Solutions :**\n` +
                             `â€¢ Augmenter le niveau de timeout\n` +
                             `â€¢ Choisir un modèle plus rapide\n` +
                             `â€¢ Simplifier votre requÃªte`;
                notificationMessage = `Timeout (${this.currentTimeoutLevel})`;
            } else {
                errorMessage = 'âŒ Erreur: ' + error.message;
            }
            
            this.updateMessage(messageDiv, errorMessage, model);
            showNotification(notificationMessage, 'warning');
            
        } finally {
            this.isProcessing = false;
            this.updateUI();
            console.log('sendSimple terminé');
        }
    }
    
    async sendConsensus(prompt) {
        const selectedWorkers = this.getSelectedWorkers();
        const mergerSelect = document.getElementById('mergerSelect');
        const merger = mergerSelect ? mergerSelect.value : null;
        
        if (selectedWorkers.length < 2) {
            showNotification(this.i18n.t('select_workers'), 'warning');
            return;
        }
        
        if (!merger) {
            showNotification(this.i18n.t('select_merger'), 'warning');
            return;
        }
        
        this.isProcessing = true;
        this.updateUI();
        
        const messageDiv = this.addMessage('assistant', this.i18n.t('processing_consensus'), []);
            
        let fullPrompt = prompt;
        
        // MÃªme logique que sendSimple
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            console.log('Lecture des fichiers joints pour consensus:', this.selectedFiles.length);
            const filesContent = [];
            
            for (const file of this.selectedFiles) {
                try {
                    const content = await readFileContent(file);
                    filesContent.push(`=== Fichier: ${file.name} ===\n${content}\n=== Fin du fichier ===`);
                    console.log(`Fichier lu: ${file.name} (${content.length} caractères)`);
                } catch (error) {
                    console.error('Erreur lecture fichier:', error);
                    filesContent.push(`=== Fichier: ${file.name} ===\n[ERREUR: Impossible de lire le fichier]\n=== Fin du fichier ===`);
                }
            }
            
            fullPrompt = `Fichiers joints (${this.selectedFiles.length}):\n${filesContent.join('\n\n')}\n\nQuestion: ${prompt}`;
        }
        
        try {
            console.log('Envoi requÃªte consensus Ã  l API (timeout backend: ' + this.currentTimeoutLevel + ') avec fichiers:', this.selectedFiles?.length || 0);
            
            const response = await fetch('/api/consensus-generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    worker_models: selectedWorkers,
                    merger_model: merger,
                    prompt: fullPrompt,
                    session_id: this.sessionId,
                    timeout_level: this.currentTimeoutLevel,
                    language: this.i18n.currentLang
                })
            });
            
            console.log('Réponse API reçue:', response.status);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateConsensusMessage(messageDiv, data);
            } else {
                throw new Error(data.error || 'Erreur inconnue');
            }
            
        } catch (error) {
            console.error('Erreur sendConsensus:', error);
            
            let errorMessage = 'Erreur de communication';
            if (error.name === 'AbortError') {
                errorMessage = `â±ï¸ **Timeout backend dépassé (${this.currentTimeoutLevel})**\n\n` +
                             `Le consensus a dépassé le timeout configuré.`;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'ðŸŒ Impossible de contacter le serveur';
            } else if (error.message.includes('timeout')) {
                errorMessage = `â±ï¸ **Timeout dépassé (${this.currentTimeoutLevel})**\n\n` +
                             `Le consensus a mis trop de temps Ã  se former.`;
            } else {
                errorMessage = 'âŒ Erreur: ' + error.message;
            }
            
            this.updateMessage(messageDiv, errorMessage, 'consensus');
            showNotification('Problème de connexion au serveur', 'error');
            
        } finally {
            this.isProcessing = false;
            this.updateUI();
        }
    }
    
    // Méthodes de base (implémentées dans ui.js)
    setupEventListeners() {
        console.log('setupEventListeners - méthode de base');
    }
    
    updateUI() {
        console.log('updateUI - méthode de base');
    }
    
    addMessage(type, content, files) {
        console.log('addMessage - méthode de base');
        return document.createElement('div');
    }
    
    updateMessage(messageDiv, content, model) {
        console.log('updateMessage - méthode de base');
    }
    
    updateConsensusMessage(messageDiv, data) {
        console.log('updateConsensusMessage - méthode de base');
    }
    
    populateModelSelects() {
        console.log('populateModelSelects - méthode de base');
    }
    
    clearInput() {
        console.log('clearInput - méthode de base');
    }
    
    clearFiles() {
        console.log('clearFiles - méthode de base');
    }
    
    getSelectedWorkers() {
        console.log('getSelectedWorkers - méthode de base');
        return [];
    }
    
    async loadModels() {
        try {
            console.log('Chargement des modèles...');
            const response = await fetch('/api/models');
            const data = await response.json();
            
            if (data.success) {
                this.availableModels = data.models.sort();
                this.populateModelSelects();
                showNotification(this.i18n.t('models_loaded'), 'success');
            }
        } catch (error) {
            console.error('Error loading models:', error);
            showNotification(this.i18n.t('error_occurred'), 'error');
        }
    }
    
    async loadTimeoutLevels() {
        try {
            const response = await fetch('/api/timeout-levels');
            const data = await response.json();
            
            if (data.success) {
                this.timeoutLevels = data.levels;
                this.updateTimeoutInfo();
            }
        } catch (error) {
            console.error('Error loading timeout levels:', error);
        }
    }
    
    async loadStats() {
        try {
            console.log('Chargement des statistiques...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(function() {
                console.log('Timeout stats après 3 secondes');
                controller.abort();
            }, 3000);

            const response = await fetch('/api/stats', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();
            
            if (data.success && data.stats) {
                this.updateStatsDisplay(data.stats);
                this.statsFailCount = 0;
                console.log('Stats chargées avec succès');
            } else {
                throw new Error('Données de stats invalides');
            }
        } catch (error) {
            this.statsFailCount++;
            
            if (error.name === 'AbortError') {
                console.warn('Stats timeout (tentative ' + this.statsFailCount + '/' + this.maxStatsRetries + ')');
            } else {
                console.warn('Error loading stats (attempt ' + this.statsFailCount + '/' + this.maxStatsRetries + '):', error.message);
            }

            if (this.statsFailCount >= this.maxStatsRetries) {
                console.warn('Stats endpoint unavailable, using default values');
                this.updateStatsDisplay({
                    models_count: this.availableModels.length || 0,
                    total_conversations: 0,
                    success_rate: 100,
                    avg_response_time: 0.0
                });
                
                this.stopStatsRefresh();
            }
        }
    }
    
    stopStatsRefresh() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
            console.log('RafraÃ®chissement stats arrÃªté');
        }
    }
    
    updateTimeoutInfo() {
        const timeoutInfo = document.getElementById('timeoutInfo');
        if (timeoutInfo && this.timeoutLevels[this.currentTimeoutLevel]) {
            const level = this.timeoutLevels[this.currentTimeoutLevel];
            const timeoutText = this.i18n.t('timeout_info')
                .replace('{simple}', level.simple_minutes + ' min')
                .replace('{consensus}', level.consensus_minutes + ' min');
            timeoutInfo.textContent = timeoutText;
        }
    }
    
    updateStatsDisplay(stats) {
        if (!stats) return;
        
        const modelsCount = stats.models_count || this.availableModels.length || 0;
        
        const modelsCountEl = document.getElementById('modelsCount');
        const totalRequestsEl = document.getElementById('totalRequests');
        const successRateEl = document.getElementById('successRate');
        const avgTimeEl = document.getElementById('avgTime');
        const welcomeModelsCountEl = document.getElementById('welcomeModelsCount');
        
        if (modelsCountEl) modelsCountEl.textContent = modelsCount;
        if (totalRequestsEl) totalRequestsEl.textContent = stats.total_conversations || 0;
        if (successRateEl) successRateEl.textContent = (stats.success_rate || 100).toFixed(2) + '%';
        if (avgTimeEl) avgTimeEl.textContent = (stats.avg_response_time || 0.0).toFixed(2) + 's';
        if (welcomeModelsCountEl) welcomeModelsCountEl.textContent = modelsCount;
    }
    
    startStatsRefresh() {
        if (!this.statsRefreshInterval && this.statsFailCount < this.maxStatsRetries) {
            console.log('Démarrage rafraÃ®chissement stats (30s)');
            this.statsRefreshInterval = setInterval(() => {
                if (this.statsFailCount < this.maxStatsRetries) {
                    this.loadStats();
                } else {
                    this.stopStatsRefresh();
                }
            }, 30000);
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.mode-btn').forEach(function(btn) {
            const modeCapitalized = mode.charAt(0).toUpperCase() + mode.slice(1);
            btn.classList.toggle('active', btn.id === 'mode' + modeCapitalized);
        });
        
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
        
        showNotification(this.i18n.t('mode_switched_' + mode), 'info');
    }
    
    // Méthodes simplifiées
    async sendSimpleMessage(content, files) {
        console.log('Envoi message simple:', content.substring(0, 50) + '...');
        return await this.sendSimple(content);
    }
    
    async sendConsensusMessage(content, files) {
        console.log('Envoi message consensus:', content.substring(0, 50) + '...');
        return await this.sendConsensus(content);
    }
}
