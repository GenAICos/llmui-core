/*
 * LLMUI Core v2.0 - I18n System
 * Author: François Chalut
 * Website: https://llmui.org
 */

const translations = {
    fr: {
        subtitle: "Système de génération de consensus multi-modèles",
        mode_simple: "Simple",
        mode_consensus: "Consensus",
        timeout_level: "Niveau de timeout",
        timeout_low: "Bas (15 min)",
        timeout_medium: "Moyen (1h)",
        timeout_high: "Haut (4h)",
        timeout_very_high: "Très Haut (4h)",
        select_model: "Modèle",
        loading_models: "Chargement des modèles...",
        simple_description: "Choisissez votre LLM et commencez à discuter",
        worker_models: "Modèles workers (sélectionnez 2-5)",
        merger_model: "Modèle merger",
        consensus_threshold: "Seuil de consensus",
        preset_fast: "Rapide",
        preset_balanced: "Équilibré",
        preset_quality: "Qualité",
        consensus_description: "Plusieurs modèles analysent et fusionnent leurs réponses",
        welcome_title: "Bienvenue sur LLMUI Core",
        welcome_msg: "Sélectionnez un mode et commencez à discuter avec vos LLMs locaux",
        welcome_message: "Bienvenue dans LLMUI Core ! Je suis prêt à traiter vos requêtes.",
        attach_files: "Joindre des fichiers",
        files_button: "Fichiers",
        enter_message: "Entrez votre message... (Shift+Enter pour nouvelle ligne)",
        send_btn: "Envoyer",
        pause_btn: "Pause",
        resume_btn: "Reprendre",
        clear_btn: "Effacer",
        reload_btn: "Recharger dernier",
        stats_title: "Statistiques",
        total_conversations: "Total conversations",
        total_messages: "Total messages",
        avg_response_time: "Temps moy. réponse",
        success_rate: "Taux de succès",
        about_title: "À propos de LLMUI Core v2.0",
        features_title: "Fonctionnalités",
        feature_simple: "Mode Simple : Conversation directe avec un LLM",
        feature_consensus: "Mode Consensus : Fusion intelligente de plusieurs modèles",
        feature_memory: "Mémoire hybride avec compression",
        feature_files: "Support multi-fichiers avec drag & drop",
        feature_sqlite: "Persistance SQLite",
        feature_ssl: "Support SSL/HTTPS",
        author_title: "Auteur",
        version_title: "Version",
        license: "Licence : AGPLv3",
        theme_toggle: "Changer de thème",
        info_btn: "Information",
        timeout_info: "Timeout actuel : {simple} (simple) / {consensus} (consensus)",
        file_removed: "Fichier supprimé : {filename}",
        files_cleared: "Tous les fichiers supprimés",
        file_too_large: "Fichier trop volumineux : {filename} ({size})",
        total_size_exceeded: "Taille totale dépassée : {total}",
        invalid_extension: "Extension non valide : {filename}",
        processing: "Traitement en cours...",
        processing_consensus: "Génération du consensus en cours...",
        error_occurred: "Une erreur s'est produite",
        select_workers: "Sélectionnez au moins 2 modèles workers",
        select_merger: "Sélectionnez un modèle merger",
        enter_prompt: "Veuillez entrer un message",
        cleared_conversation: "Conversation effacée",
        no_last_message: "Aucun dernier message à recharger",
        last_message_reloaded: "Dernier message rechargé",
        models_loaded: "Modèles chargés avec succès",
        stats_updated: "Statistiques mises à jour",
        mode_switched_simple: "Mode Simple activé",
        mode_switched_consensus: "Mode Consensus activé",
        chat_title: "Interface de Consensus",
        chat_subtitle: "Interagissez avec le collectif d'IA",
        new_conversation: "Effacé la conversation",
        system_ready: "Système prêt",
        system_active: "Système Actif",
        welcome_system: "Système initialisé",
        welcome_models: "modèles disponibles",
        welcome_ready: "Prêt pour le consensus",
        welcome_authenticated: "Session authentifiée",
        toggle_theme: "Basculer le thème",
        toggle_language: "Changer de langue",
        models_label: "Modèles",
        requests_label: "Requêtes",
        consensus_label: "Consensus",
        avg_time_label: "Temps Moy.",
        info_modal_title: "Fonctionnalités LLMUI Core",
        info_description: "Interface de consensus multi-modèles",
        info_feature_simple_mode: "Conversation directe avec un modèle unique",
        info_feature_consensus_mode: "Plusieurs modèles analysent votre requête",
        info_feature_multifiles: "Support de plusieurs fichiers simultanément",
        info_feature_sort: "Modèles organisés pour faciliter la sélection",
        info_feature_edit: "Modifiez votre dernier prompt directement",
        info_feature_stats: "Suivez vos interactions",
        info_feature_theme: "Interface adaptative",
        info_feature_memory: "Conservation du contexte conversationnel",
        info_feature_auth: "Authentification : Connexion sécurisée et gestion des sessions",
        info_formats_supported: "Formats supportés :",
        info_formats_text: "Fichiers texte (.txt, .md)",
        info_formats_code: "Code source (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "Données (.csv)",
        info_formats_office: "Bureautique (.docx, .xlsx, .pdf)",
        info_warning: "Note : Certains petits modèles ne supportent pas les fichiers",
        nouvelleConversation: "Nouvelle conversation",
        close_panel: "Fermer le panneau"
    },
    en: {
        subtitle: "Multi-model consensus generation system",
        mode_simple: "Simple",
        mode_consensus: "Consensus",
        timeout_level: "Timeout level",
        timeout_low: "Low (15 min)",
        timeout_medium: "Medium (1h)",
        timeout_high: "High (4h)",
        timeout_very_high: "Very High (4h)",
        select_model: "Model",
        loading_models: "Loading models...",
        simple_description: "Choose your LLM and start chatting",
        worker_models: "Worker models (select 2-5)",
        merger_model: "Merger model",
        consensus_threshold: "Consensus threshold",
        preset_fast: "Fast",
        preset_balanced: "Balanced",
        preset_quality: "Quality",
        consensus_description: "Multiple models analyze and merge their responses",
        welcome_title: "Welcome to LLMUI Core",
        welcome_msg: "Select a mode and start chatting with your local LLMs",
        welcome_message: "Welcome to LLMUI Core! I'm ready to process your queries.",
        attach_files: "Attach files",
        files_button: "Files",
        enter_message: "Enter your message... (Shift+Enter for new line)",
        send_btn: "Send",
        pause_btn: "Pause",
        resume_btn: "Resume",
        clear_btn: "Clear",
        reload_btn: "Reload last",
        stats_title: "Statistics",
        total_conversations: "Total conversations",
        total_messages: "Total messages",
        avg_response_time: "Avg. response time",
        success_rate: "Success rate",
        about_title: "About LLMUI Core v2.0",
        features_title: "Features",
        feature_simple: "Simple Mode: Direct conversation with one LLM",
        feature_consensus: "Consensus Mode: Intelligent fusion of multiple models",
        feature_memory: "Hybrid memory with compression",
        feature_files: "Multi-file support with drag & drop",
        feature_sqlite: "SQLite persistence",
        feature_ssl: "SSL/HTTPS support",
        author_title: "Author",
        version_title: "Version",
        license: "License: MIT",
        theme_toggle: "Toggle theme",
        info_btn: "Information",
        timeout_info: "Current timeout: {simple} (simple) / {consensus} (consensus)",
        file_removed: "File removed: {filename}",
        files_cleared: "All files cleared",
        file_too_large: "File too large: {filename} ({size})",
        total_size_exceeded: "Total size exceeded: {total}",
        invalid_extension: "Invalid extension: {filename}",
        processing: "Processing...",
        processing_consensus: "Generating consensus...",
        error_occurred: "An error occurred",
        select_workers: "Select at least 2 worker models",
        select_merger: "Select a merger model",
        enter_prompt: "Please enter a message",
        cleared_conversation: "Conversation cleared",
        no_last_message: "No last message to reload",
        last_message_reloaded: "Last message reloaded",
        models_loaded: "Models loaded successfully",
        stats_updated: "Statistics updated",
        mode_switched_simple: "Simple Mode activated",
        mode_switched_consensus: "Consensus Mode activated",
        chat_title: "Consensus Interface",
        chat_subtitle: "Interact with the AI collective",
        new_conversation: "Erase conversation",
        system_ready: "System ready",
        system_active: "System Active",
        welcome_system: "System initialized",
        welcome_models: "models available",
        welcome_ready: "Ready for consensus",
        welcome_authenticated: "Session authenticated",
        toggle_theme: "Toggle theme",
        toggle_language: "Change language",
        models_label: "Models",
        requests_label: "Requests",
        consensus_label: "Consensus",
        avg_time_label: "Avg. Time",
        info_modal_title: "LLMUI Core Features",
        info_description: "Multi-model consensus interface",
        info_feature_simple_mode: "Direct conversation with a single model",
        info_feature_consensus_mode: "Multiple models analyze your query",
        info_feature_multifiles: "Support for multiple simultaneous files",
        info_feature_sort: "Models organized for easy selection",
        info_feature_edit: "Modify your last prompt directly",
        info_feature_stats: "Track your interactions",
        info_feature_theme: "Adaptive interface",
        info_feature_memory: "Conversational context preservation",
        info_feature_auth: "Authentication: Secure login and session management",
        info_formats_supported: "Supported formats:",
        info_formats_text: "Text files (.txt, .md)",
        info_formats_code: "Source code (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "Data (.csv)",
        info_formats_office: "Office (.docx, .xlsx, .pdf)",
        info_warning: "Note: Some small models do not support files",
        nouvelleConversation: "New chat",
        close_panel: "Close panel"
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('llmui_lang') || 'fr';
        this.translations = translations;
        
        // Initialize language button on load
        this.initLanguageButton();
    }
    
    // Initialize language button with correct flag and text
    initLanguageButton() {
        const langFlag = document.getElementById('langFlag');
        const langText = document.getElementById('langText');
        if (langFlag && langText) {
            if (this.currentLang === 'fr') {
                langFlag.textContent = '🇫🇷';
                langText.textContent = 'FR';
            } else {
                langFlag.textContent = '🇬🇧';
                langText.textContent = 'EN';
            }
        }
    }
    
    // Set language and update entire UI
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error(`Language ${lang} not supported`);
            return;
        }
        
        this.currentLang = lang;
        localStorage.setItem('llmui_lang', lang);
        this.updateUI();
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Update language button flag and text
        const langFlag = document.getElementById('langFlag');
        const langText = document.getElementById('langText');
        if (langFlag && langText) {
            if (lang === 'fr') {
                langFlag.textContent = '🇫🇷';
                langText.textContent = 'FR';
            } else {
                langFlag.textContent = '🇬🇧';
                langText.textContent = 'EN';
            }
        }
    }
    
    t(key, params = {}) {
        let text = this.translations[this.currentLang][key] || key;
        
        // Replace parameters
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    }
    
    updateUI() {
        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = this.t(key);
            } else if (el.tagName === 'OPTION') {
                el.textContent = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });
        
        // Update all elements with data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
        
        // Update all elements with data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
        
        // Update specific elements
        this.updateSpecificElements();
    }
    
    updateSpecificElements() {
        // Update chat title and subtitle
        const chatTitle = document.querySelector('.chat-title');
        if (chatTitle) chatTitle.textContent = this.t('chat_title');
        
        const chatSubtitle = document.querySelector('.chat-subtitle');
        if (chatSubtitle) chatSubtitle.textContent = this.t('chat_subtitle');
        
        // Update status text
        const statusText = document.getElementById('statusText');
        if (statusText) statusText.textContent = this.t('system_active');
        
        // Update welcome message
        const welcomeMessageEl = document.querySelector('.welcome-message-text');
        if (welcomeMessageEl) welcomeMessageEl.textContent = this.t('welcome_message');
        
        // Update info modal content
        this.updateInfoModal();
    }
    
    updateInfoModal() {
        const infoModal = document.getElementById('infoModal');
        if (!infoModal) return;
        
        const title = infoModal.querySelector('h2');
        if (title) title.textContent = '📋 ' + this.t('info_modal_title');
        
        const content = infoModal.querySelector('.info-content');
        if (content) {
            content.innerHTML = `
                <p><strong>${this.t('info_description')}</strong></p>
                <ul>
                    <li><strong>Mode Simple</strong> : ${this.t('info_feature_simple_mode')}</li>
                    <li><strong>Mode Consensus</strong> : ${this.t('info_feature_consensus_mode')}</li>
                    <li><strong>Multi-fichiers</strong> : ${this.t('info_feature_multifiles')}</li>
                    <li><strong>Tri alphabétique</strong> : ${this.t('info_feature_sort')}</li>
                    <li><strong>Édition en ligne</strong> : ${this.t('info_feature_edit')}</li>
                    <li><strong>Thème clair/sombre</strong> : ${this.t('info_feature_theme')}</li>
                    <li><strong>Mémoire de session</strong> : ${this.t('info_feature_memory')}</li>
                    <li>🔒 ${this.t('info_feature_auth')}</li>
                </ul>
                
                <p><strong>${this.t('info_formats_supported')}</strong></p>
                <ul>
                    <li>${this.t('info_formats_text')}</li>
                    <li>${this.t('info_formats_code')}</li>
                    <li>${this.t('info_formats_data')}</li>
                    <li>${this.t('info_formats_office')}</li>
                </ul>
            `;
        }
    }
}