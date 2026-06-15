/*
 * LLMUI Core v1.0.0 - Main App Logic
 * Author: Francois Chalut
 * Website: https://llmui.org
 * 
 * CORRECTIONS v1.0.0:
 * - FIX: Extraction correcte des noms de modèles depuis les objets
 * - FIX: Gestion robuste des endpoints API manquants avec fallbacks
 * - FIX: Valeurs par défaut pour timeoutLevels
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
        
        // Default timeout levels (fallback si API non disponible)
        this.timeoutLevels = {
            low: { simple_minutes: 15, consensus_minutes: 30 },
            medium: { simple_minutes: 60, consensus_minutes: 120 },
            high: { simple_minutes: 240, consensus_minutes: 480 },
            very_high: { simple_minutes: 720, consensus_minutes: 1440 }
        };
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
            }
        }, 100);
    }
    
    async sendMessage(prompt, isEdited = false) {
        if (!prompt || prompt.trim() === '') {
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
            const filesContent = [];
            
            for (const file of this.selectedFiles) {
                try {
                    const content = await readFileContent(file);
                    filesContent.push(`=== Fichier: ${file.name} ===\n${content}\n=== Fin du fichier ===`);
                } catch (error) {
                    console.error('Erreur lecture fichier:', error);
                    filesContent.push(`=== Fichier: ${file.name} ===\n[ERREUR: Impossible de lire le fichier]\n=== Fin du fichier ===`);
                }
            }
            
            fullPrompt = `Fichiers joints (${this.selectedFiles.length}):\n${filesContent.join('\n\n')}\n\nQuestion: ${prompt}`;
        }
        
        try {
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
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.success) {
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
                errorMessage = `⏱️ **Timeout backend dépassé**\n\n` +
                             `Le modèle LLM a dépassé le timeout configuré (${this.currentTimeoutLevel}).\n\n` +
                             `**Solutions :**\n` +
                             `• Choisir un timeout plus long\n` +
                             `• Utiliser un modèle plus rapide\n` +
                             `• Simplifier votre requête`;
                notificationMessage = `Timeout backend (${this.currentTimeoutLevel})`;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = '🌐 Impossible de contacter le serveur';
                notificationMessage = 'Serveur inaccessible';
            } else if (error.message.includes('404')) {
                errorMessage = `❌ **Endpoint non implémenté**\n\n` +
                             `L'endpoint /api/simple-generate n'existe pas sur le serveur.\n\n` +
                             `**Vérifiez :**\n` +
                             `• Que le serveur backend est bien démarré\n` +
                             `• Que la route /api/simple-generate est implémentée\n` +
                             `• Les logs du serveur pour plus de détails`;
                notificationMessage = 'API non implémentée (404)';
            } else if (error.message.includes('timeout')) {
                errorMessage = `⏱️ **Timeout dépassé (${this.currentTimeoutLevel})**\n\n` +
                             `Le modèle LLM a mis trop de temps à répondre.\n\n` +
                             `**Solutions :**\n` +
                             `• Augmenter le niveau de timeout\n` +
                             `• Choisir un modèle plus rapide\n` +
                             `• Simplifier votre requête`;
                notificationMessage = `Timeout (${this.currentTimeoutLevel})`;
            } else {
                errorMessage = '❌ Erreur: ' + error.message;
            }
            
            this.updateMessage(messageDiv, errorMessage, model);
            showNotification(notificationMessage, 'error');
            
        } finally {
            this.isProcessing = false;
            this.updateUI();
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
        
        const messageDiv = this.addMessage('llmui', this.i18n.t('processing_consensus'), []);
        
        let fullPrompt = prompt;
        
        // Ajouter le contenu des fichiers au prompt
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            const filesContent = [];
            
            for (const file of this.selectedFiles) {
                try {
                    const content = await readFileContent(file);
                    filesContent.push(`=== Fichier: ${file.name} ===\n${content}\n=== Fin du fichier ===`);
                } catch (error) {
                    console.error('Erreur lecture fichier:', error);
                    filesContent.push(`=== Fichier: ${file.name} ===\n[ERREUR: Impossible de lire le fichier]\n=== Fin du fichier ===`);
                }
            }
            
            fullPrompt = `Fichiers joints (${this.selectedFiles.length}):\n${filesContent.join('\n\n')}\n\nQuestion: ${prompt}`;
        }
        
        try {
            const response = await fetch('/api/consensus-generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    workers: selectedWorkers,
                    merger: merger,
                    prompt: fullPrompt,
                    session_id: this.sessionId,
                    timeout_level: this.currentTimeoutLevel,
                    language: this.i18n.currentLang
                })
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateConsensusMessage(messageDiv, data);
                showNotification('Consensus obtenu', 'success');
            } else {
                throw new Error(data.error || 'Erreur inconnue');
            }
            
        } catch (error) {
            console.error('Error in sendConsensus:', error);
            this.updateMessage(messageDiv, '❌ Erreur: ' + error.message, 'consensus');
            showNotification('Problème de connexion au serveur', 'error');
            
        } finally {
            this.isProcessing = false;
            this.updateUI();
        }
    }
    
    // Méthodes de base (implémentées dans ui.js)
    setupEventListeners() {
    }
    
    updateUI() {
    }
    
    addMessage(type, content, files) {
        return document.createElement('div');
    }
    
    updateMessage(messageDiv, content, model) {
    }
    
    updateConsensusMessage(messageDiv, data) {
    }
    
    populateModelSelects() {
        if (!this.availableModels || this.availableModels.length === 0) {
            console.warn('Aucun modèle disponible');
            return;
        }
        
        // 1. Remplir le select simple
        const simpleSelect = document.getElementById('simpleModelSelect');
        if (simpleSelect) {
            simpleSelect.innerHTML = '';
            this.availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                simpleSelect.appendChild(option);
            });
            
            // Sélectionner le premier modèle par défaut
            if (this.availableModels.length > 0) {
                simpleSelect.value = this.availableModels[0];
            }
        }
        
        // 2. Remplir le select merger
        const mergerSelect = document.getElementById('mergerSelect');
        if (mergerSelect) {
            mergerSelect.innerHTML = '';
            this.availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                mergerSelect.appendChild(option);
            });
            
            // Sélectionner le premier modèle par défaut
            if (this.availableModels.length > 0) {
                mergerSelect.value = this.availableModels[0];
            }
        }
        
        // 3. Créer les checkboxes pour les workers
        const workerGrid = document.getElementById('workerModels');
        if (workerGrid) {
            workerGrid.innerHTML = '';
            
            this.availableModels.forEach((model, index) => {
                // Créer le container pour chaque checkbox
                const checkboxContainer = document.createElement('label');
                checkboxContainer.className = 'model-checkbox';
                
                // Créer la checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = model;
                checkbox.name = 'worker-model';
                checkbox.id = `worker-${index}`;
                
                // Créer le label
                const labelText = document.createElement('span');
                labelText.textContent = model;
                
                // Assembler
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(labelText);
                workerGrid.appendChild(checkboxContainer);
            });
        }
    }
    
    clearInput() {
    }
    
    clearFiles() {
    }
    
    getSelectedWorkers() {
        const checkboxes = document.querySelectorAll('input[name="worker-model"]:checked');
        const selectedWorkers = Array.from(checkboxes).map(cb => cb.value);
        return selectedWorkers;
    }
    
    async loadModels() {
        try {
            const response = await fetch('/api/models');
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // FIX: Extraire les noms de modèles depuis les objets
                // L'API retourne: [{name: "model1", size: 123}, {name: "model2", size: 456}]
                // On doit extraire juste les noms et trier
                this.availableModels = data.models
                    .map(model => {
                        // Si c'est un objet, extraire le nom
                        if (typeof model === 'object' && model !== null && model.name) {
                            return model.name;
                        }
                        // Sinon retourner tel quel (rétrocompatibilité)
                        return model;
                    })
                    .filter(model => model) // Enlever les valeurs nulles/undefined
                    .sort((a, b) => {
                        // Tri alphabétique insensible à la casse
                        return a.toLowerCase().localeCompare(b.toLowerCase());
                    });
                
                this.populateModelSelects();
                showNotification(this.i18n.t('models_loaded'), 'success');
            } else {
                throw new Error('Réponse API invalide');
            }
        } catch (error) {
            console.error('Error loading models:', error);
            showNotification('⚠️ Impossible de charger les modèles', 'error');
            
            // Fallback: essayer de continuer sans modèles
            this.availableModels = [];
            this.populateModelSelects();
        }
    }
    
    async loadTimeoutLevels() {
        try {
            const response = await fetch('/api/timeout-levels');
            
            if (!response.ok) {
                console.warn('API timeout-levels non disponible, utilisation des valeurs par défaut');
                this.updateTimeoutInfo();
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.levels) {
                // Fusionner avec les valeurs par défaut (au cas où)
                this.timeoutLevels = { ...this.timeoutLevels, ...data.levels };
            }
            
            this.updateTimeoutInfo();
        } catch (error) {
            console.warn('Error loading timeout levels (using defaults):', error);
            // Utiliser les valeurs par défaut déjà définies dans le constructeur
            this.updateTimeoutInfo();
        }
    }
    
    async loadStats() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(function() {
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
                console.warn('⚠️ Stats endpoint unavailable, using default values');
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
        }
    }
    
    updateTimeoutInfo() {
        const timeoutInfo = document.getElementById('timeoutInfo');
        if (timeoutInfo && this.timeoutLevels && this.timeoutLevels[this.currentTimeoutLevel]) {
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
        return await this.sendSimple(content);
    }
    
    async sendConsensusMessage(content, files) {
        return await this.sendConsensus(content);
    }
}
