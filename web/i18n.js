/*
 * LLMUI Core v1.0.0 - I18n System
 * Author: François Chalut
 * Website: https://llmui.org
 */

// Langues supportées par l'interface (sélecteur login + chat)
const LANGUAGES = [
    { code: "fr", flag: "🇫🇷", name: "Français", dir: "ltr" },
    { code: "en", flag: "🇬🇧", name: "English", dir: "ltr" },
    { code: "es", flag: "🇪🇸", name: "Español", dir: "ltr" },
    { code: "de", flag: "🇩🇪", name: "Deutsch", dir: "ltr" },
    { code: "pt", flag: "🇵🇹", name: "Português", dir: "ltr" },
    { code: "ar", flag: "🇸🇦", name: "العربية", dir: "rtl" }
];

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
        about_title: "À propos de LLMUI Core v1.0.0",
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
        close_panel: "Fermer le panneau",
        open_panel: "Ouvrir le panneau",
        andy_status_ready: "Prêt à vous aider",
        andy_welcome: "Bonjour ! Je suis Andy, votre assistant. Comment puis-je vous aider avec LLMUI Core ?",
        andy_thinking: "Andy réfléchit",
        andy_input_placeholder: "Posez votre question...",
        andy_speak_human: "Parler à un humain",
        login_page_title: "LLMUI - Connexion",
        login_app_subtitle: "Interface de Consensus Multi-Modèles",
        login_heading: "🔐 Connexion",
        login_subtitle: "Connectez-vous à votre compte LLMUI",
        login_username_label: "👤 Nom d'utilisateur",
        login_username_placeholder: "Entrez votre nom d'utilisateur",
        login_password_label: "🔑 Mot de passe",
        login_password_placeholder: "Entrez votre mot de passe",
        login_remember_me: "Se souvenir de moi",
        login_button: "Se connecter",
        login_verify_button: "Vérifier",
        login_button_loading: "Connexion en cours...",
        login_totp_label: "🔢 Code de vérification",
        login_totp_placeholder: "123456",
        login_totp_hint: "Code à 6 chiffres de votre application d'authentification, ou un code de récupération.",
        login_forgot_password: "Mot de passe oublié ?",
        login_version_info: "LLMUI Core v1.0.0 • Connexion sécurisée",
        totp_setup_heading: "🔐 Configuration TOTP requise",
        totp_setup_desc: "Votre compte administrateur nécessite une authentification à deux facteurs.",
        totp_step1_title: "1. Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)",
        totp_step1_sub: "Ou entrez cette clé manuellement :",
        totp_open_app_link: "Ouvrir dans l'application d'authentification",
        totp_step2_title: "2. Conservez ces codes de récupération en lieu sûr",
        totp_step2_hint: "Chaque code n'est utilisable qu'une seule fois en cas de perte de votre application d'authentification.",
        totp_step3_title: "3. Entrez le code généré pour activer la protection",
        totp_activate_button: "Activer le TOTP",
        totp_activate_loading: "Activation en cours...",
        totp_qr_alt: "QR code de configuration TOTP",
        auth_fill_fields: "Veuillez remplir tous les champs",
        auth_login_success: "Connexion réussie ! Redirection...",
        auth_invalid_credentials: "Nom d'utilisateur ou mot de passe incorrect",
        auth_invalid_server_response: "Réponse serveur invalide",
        auth_server_error: "Erreur de connexion au serveur. Veuillez réessayer.",
        auth_totp_enter_code: "Veuillez entrer votre code de vérification.",
        auth_totp_invalid: "Code TOTP invalide",
        auth_totp_activated: "TOTP activé ! Redirection...",
        auth_totp_setup_failed: "Impossible d'initialiser la configuration TOTP. Veuillez réessayer.",
        auth_totp_code_digits: "Le code doit contenir 6 chiffres.",
        auth_forgot_password_msg: "Contactez l'administrateur système pour réinitialiser votre mot de passe."
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
        about_title: "About LLMUI Core v1.0.0",
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
        close_panel: "Close panel",
        open_panel: "Open panel",
        andy_status_ready: "Ready to help",
        andy_welcome: "Hello! I'm Andy, your assistant. How can I help you with LLMUI Core?",
        andy_thinking: "Andy is thinking",
        andy_input_placeholder: "Ask your question...",
        andy_speak_human: "Talk to a human",
        login_page_title: "LLMUI - Login",
        login_app_subtitle: "Multi-Model Consensus Interface",
        login_heading: "🔐 Login",
        login_subtitle: "Sign in to your LLMUI account",
        login_username_label: "👤 Username",
        login_username_placeholder: "Enter your username",
        login_password_label: "🔑 Password",
        login_password_placeholder: "Enter your password",
        login_remember_me: "Remember me",
        login_button: "Sign in",
        login_verify_button: "Verify",
        login_button_loading: "Signing in...",
        login_totp_label: "🔢 Verification code",
        login_totp_placeholder: "123456",
        login_totp_hint: "6-digit code from your authenticator app, or a recovery code.",
        login_forgot_password: "Forgot your password?",
        login_version_info: "LLMUI Core v1.0.0 • Secure login",
        totp_setup_heading: "🔐 TOTP Setup Required",
        totp_setup_desc: "Your administrator account requires two-factor authentication.",
        totp_step1_title: "1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)",
        totp_step1_sub: "Or enter this key manually:",
        totp_open_app_link: "Open in authenticator app",
        totp_step2_title: "2. Keep these recovery codes in a safe place",
        totp_step2_hint: "Each code can only be used once if you lose access to your authenticator app.",
        totp_step3_title: "3. Enter the generated code to activate protection",
        totp_activate_button: "Activate TOTP",
        totp_activate_loading: "Activating...",
        totp_qr_alt: "TOTP setup QR code",
        auth_fill_fields: "Please fill in all fields",
        auth_login_success: "Login successful! Redirecting...",
        auth_invalid_credentials: "Incorrect username or password",
        auth_invalid_server_response: "Invalid server response",
        auth_server_error: "Server connection error. Please try again.",
        auth_totp_enter_code: "Please enter your verification code.",
        auth_totp_invalid: "Invalid TOTP code",
        auth_totp_activated: "TOTP activated! Redirecting...",
        auth_totp_setup_failed: "Unable to initialize TOTP setup. Please try again.",
        auth_totp_code_digits: "The code must contain 6 digits.",
        auth_forgot_password_msg: "Contact your system administrator to reset your password."
    },
    es: {
        subtitle: "Sistema de generación de consenso multi-modelo",
        mode_simple: "Simple",
        mode_consensus: "Consenso",
        timeout_level: "Nivel de tiempo de espera",
        timeout_low: "Bajo (15 min)",
        timeout_medium: "Medio (1h)",
        timeout_high: "Alto (4h)",
        timeout_very_high: "Muy alto (4h)",
        select_model: "Modelo",
        loading_models: "Cargando modelos...",
        simple_description: "Elige tu LLM y empieza a chatear",
        worker_models: "Modelos worker (selecciona 2-5)",
        merger_model: "Modelo merger",
        consensus_threshold: "Umbral de consenso",
        preset_fast: "Rápido",
        preset_balanced: "Equilibrado",
        preset_quality: "Calidad",
        consensus_description: "Varios modelos analizan y fusionan sus respuestas",
        welcome_title: "Bienvenido a LLMUI Core",
        welcome_msg: "Selecciona un modo y empieza a chatear con tus LLMs locales",
        welcome_message: "¡Bienvenido a LLMUI Core! Estoy listo para procesar tus solicitudes.",
        attach_files: "Adjuntar archivos",
        files_button: "Archivos",
        enter_message: "Escribe tu mensaje... (Mayús+Intro para nueva línea)",
        send_btn: "Enviar",
        pause_btn: "Pausar",
        resume_btn: "Reanudar",
        clear_btn: "Borrar",
        reload_btn: "Recargar último",
        stats_title: "Estadísticas",
        total_conversations: "Total de conversaciones",
        total_messages: "Total de mensajes",
        avg_response_time: "Tiempo medio de respuesta",
        success_rate: "Tasa de éxito",
        about_title: "Acerca de LLMUI Core v1.0.0",
        features_title: "Funcionalidades",
        feature_simple: "Modo Simple: Conversación directa con un LLM",
        feature_consensus: "Modo Consenso: Fusión inteligente de varios modelos",
        feature_memory: "Memoria híbrida con compresión",
        feature_files: "Soporte multi-archivo con arrastrar y soltar",
        feature_sqlite: "Persistencia SQLite",
        feature_ssl: "Soporte SSL/HTTPS",
        author_title: "Autor",
        version_title: "Versión",
        license: "Licencia: AGPLv3",
        theme_toggle: "Cambiar tema",
        info_btn: "Información",
        timeout_info: "Tiempo de espera actual: {simple} (simple) / {consensus} (consenso)",
        file_removed: "Archivo eliminado: {filename}",
        files_cleared: "Todos los archivos eliminados",
        file_too_large: "Archivo demasiado grande: {filename} ({size})",
        total_size_exceeded: "Tamaño total superado: {total}",
        invalid_extension: "Extensión no válida: {filename}",
        processing: "Procesando...",
        processing_consensus: "Generando consenso...",
        error_occurred: "Se produjo un error",
        select_workers: "Selecciona al menos 2 modelos worker",
        select_merger: "Selecciona un modelo merger",
        enter_prompt: "Por favor, escribe un mensaje",
        cleared_conversation: "Conversación borrada",
        no_last_message: "No hay último mensaje para recargar",
        last_message_reloaded: "Último mensaje recargado",
        models_loaded: "Modelos cargados correctamente",
        stats_updated: "Estadísticas actualizadas",
        mode_switched_simple: "Modo Simple activado",
        mode_switched_consensus: "Modo Consenso activado",
        chat_title: "Interfaz de Consenso",
        chat_subtitle: "Interactúa con el colectivo de IA",
        new_conversation: "Borrar la conversación",
        system_ready: "Sistema listo",
        system_active: "Sistema activo",
        welcome_system: "Sistema inicializado",
        welcome_models: "modelos disponibles",
        welcome_ready: "Listo para el consenso",
        welcome_authenticated: "Sesión autenticada",
        toggle_theme: "Cambiar tema",
        toggle_language: "Cambiar idioma",
        models_label: "Modelos",
        requests_label: "Solicitudes",
        consensus_label: "Consenso",
        avg_time_label: "Tiempo medio",
        info_modal_title: "Funcionalidades de LLMUI Core",
        info_description: "Interfaz de consenso multi-modelo",
        info_feature_simple_mode: "Conversación directa con un único modelo",
        info_feature_consensus_mode: "Varios modelos analizan tu solicitud",
        info_feature_multifiles: "Soporte para varios archivos simultáneamente",
        info_feature_sort: "Modelos organizados para facilitar la selección",
        info_feature_edit: "Edita tu último mensaje directamente",
        info_feature_stats: "Sigue tus interacciones",
        info_feature_theme: "Interfaz adaptable",
        info_feature_memory: "Conservación del contexto conversacional",
        info_feature_auth: "Autenticación: Inicio de sesión seguro y gestión de sesiones",
        info_formats_supported: "Formatos compatibles:",
        info_formats_text: "Archivos de texto (.txt, .md)",
        info_formats_code: "Código fuente (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "Datos (.csv)",
        info_formats_office: "Ofimática (.docx, .xlsx, .pdf)",
        info_warning: "Nota: Algunos modelos pequeños no admiten archivos",
        nouvelleConversation: "Nueva conversación",
        close_panel: "Cerrar panel",
        open_panel: "Abrir panel",
        andy_status_ready: "Listo para ayudarte",
        andy_welcome: "¡Hola! Soy Andy, tu asistente. ¿En qué puedo ayudarte con LLMUI Core?",
        andy_thinking: "Andy está pensando",
        andy_input_placeholder: "Escribe tu pregunta...",
        andy_speak_human: "Hablar con una persona",
        login_page_title: "LLMUI - Inicio de sesión",
        login_app_subtitle: "Interfaz de Consenso Multi-Modelo",
        login_heading: "🔐 Inicio de sesión",
        login_subtitle: "Inicia sesión en tu cuenta LLMUI",
        login_username_label: "👤 Nombre de usuario",
        login_username_placeholder: "Introduce tu nombre de usuario",
        login_password_label: "🔑 Contraseña",
        login_password_placeholder: "Introduce tu contraseña",
        login_remember_me: "Recordarme",
        login_button: "Iniciar sesión",
        login_verify_button: "Verificar",
        login_button_loading: "Iniciando sesión...",
        login_totp_label: "🔢 Código de verificación",
        login_totp_placeholder: "123456",
        login_totp_hint: "Código de 6 dígitos de tu aplicación de autenticación, o un código de recuperación.",
        login_forgot_password: "¿Olvidaste tu contraseña?",
        login_version_info: "LLMUI Core v1.0.0 • Inicio de sesión seguro",
        totp_setup_heading: "🔐 Configuración TOTP requerida",
        totp_setup_desc: "Tu cuenta de administrador requiere autenticación de dos factores.",
        totp_step1_title: "1. Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.)",
        totp_step1_sub: "O introduce esta clave manualmente:",
        totp_open_app_link: "Abrir en la aplicación de autenticación",
        totp_step2_title: "2. Guarda estos códigos de recuperación en un lugar seguro",
        totp_step2_hint: "Cada código solo se puede usar una vez si pierdes el acceso a tu aplicación de autenticación.",
        totp_step3_title: "3. Introduce el código generado para activar la protección",
        totp_activate_button: "Activar TOTP",
        totp_activate_loading: "Activando...",
        totp_qr_alt: "Código QR de configuración TOTP",
        auth_fill_fields: "Por favor, completa todos los campos",
        auth_login_success: "¡Inicio de sesión correcto! Redirigiendo...",
        auth_invalid_credentials: "Nombre de usuario o contraseña incorrectos",
        auth_invalid_server_response: "Respuesta del servidor no válida",
        auth_server_error: "Error de conexión con el servidor. Inténtalo de nuevo.",
        auth_totp_enter_code: "Por favor, introduce tu código de verificación.",
        auth_totp_invalid: "Código TOTP no válido",
        auth_totp_activated: "¡TOTP activado! Redirigiendo...",
        auth_totp_setup_failed: "No se pudo inicializar la configuración TOTP. Inténtalo de nuevo.",
        auth_totp_code_digits: "El código debe contener 6 dígitos.",
        auth_forgot_password_msg: "Contacta con el administrador del sistema para restablecer tu contraseña."
    },
    de: {
        subtitle: "Multi-Modell-Konsens-Generierungssystem",
        mode_simple: "Einfach",
        mode_consensus: "Konsens",
        timeout_level: "Timeout-Stufe",
        timeout_low: "Niedrig (15 Min.)",
        timeout_medium: "Mittel (1 Std.)",
        timeout_high: "Hoch (4 Std.)",
        timeout_very_high: "Sehr hoch (4 Std.)",
        select_model: "Modell",
        loading_models: "Modelle werden geladen...",
        simple_description: "Wähle dein LLM und starte den Chat",
        worker_models: "Worker-Modelle (2-5 auswählen)",
        merger_model: "Merger-Modell",
        consensus_threshold: "Konsens-Schwellenwert",
        preset_fast: "Schnell",
        preset_balanced: "Ausgewogen",
        preset_quality: "Qualität",
        consensus_description: "Mehrere Modelle analysieren und kombinieren ihre Antworten",
        welcome_title: "Willkommen bei LLMUI Core",
        welcome_msg: "Wähle einen Modus und chatte mit deinen lokalen LLMs",
        welcome_message: "Willkommen bei LLMUI Core! Ich bin bereit, deine Anfragen zu verarbeiten.",
        attach_files: "Dateien anhängen",
        files_button: "Dateien",
        enter_message: "Gib deine Nachricht ein... (Umschalt+Enter für neue Zeile)",
        send_btn: "Senden",
        pause_btn: "Pause",
        resume_btn: "Fortsetzen",
        clear_btn: "Löschen",
        reload_btn: "Letzte erneut laden",
        stats_title: "Statistiken",
        total_conversations: "Gespräche insgesamt",
        total_messages: "Nachrichten insgesamt",
        avg_response_time: "Durchschn. Antwortzeit",
        success_rate: "Erfolgsquote",
        about_title: "Über LLMUI Core v1.0.0",
        features_title: "Funktionen",
        feature_simple: "Einfacher Modus: Direkte Konversation mit einem LLM",
        feature_consensus: "Konsens-Modus: Intelligente Fusion mehrerer Modelle",
        feature_memory: "Hybrides Gedächtnis mit Komprimierung",
        feature_files: "Multi-Datei-Unterstützung mit Drag & Drop",
        feature_sqlite: "SQLite-Persistenz",
        feature_ssl: "SSL/HTTPS-Unterstützung",
        author_title: "Autor",
        version_title: "Version",
        license: "Lizenz: AGPLv3",
        theme_toggle: "Design wechseln",
        info_btn: "Information",
        timeout_info: "Aktuelles Timeout: {simple} (einfach) / {consensus} (Konsens)",
        file_removed: "Datei entfernt: {filename}",
        files_cleared: "Alle Dateien entfernt",
        file_too_large: "Datei zu groß: {filename} ({size})",
        total_size_exceeded: "Gesamtgröße überschritten: {total}",
        invalid_extension: "Ungültige Dateierweiterung: {filename}",
        processing: "Verarbeitung läuft...",
        processing_consensus: "Konsens wird erstellt...",
        error_occurred: "Ein Fehler ist aufgetreten",
        select_workers: "Wähle mindestens 2 Worker-Modelle aus",
        select_merger: "Wähle ein Merger-Modell aus",
        enter_prompt: "Bitte gib eine Nachricht ein",
        cleared_conversation: "Unterhaltung gelöscht",
        no_last_message: "Keine letzte Nachricht zum erneuten Laden",
        last_message_reloaded: "Letzte Nachricht erneut geladen",
        models_loaded: "Modelle erfolgreich geladen",
        stats_updated: "Statistiken aktualisiert",
        mode_switched_simple: "Einfacher Modus aktiviert",
        mode_switched_consensus: "Konsens-Modus aktiviert",
        chat_title: "Konsens-Oberfläche",
        chat_subtitle: "Interagiere mit dem KI-Kollektiv",
        new_conversation: "Unterhaltung löschen",
        system_ready: "System bereit",
        system_active: "System aktiv",
        welcome_system: "System initialisiert",
        welcome_models: "Modelle verfügbar",
        welcome_ready: "Bereit für Konsens",
        welcome_authenticated: "Sitzung authentifiziert",
        toggle_theme: "Design wechseln",
        toggle_language: "Sprache ändern",
        models_label: "Modelle",
        requests_label: "Anfragen",
        consensus_label: "Konsens",
        avg_time_label: "Ø Zeit",
        info_modal_title: "LLMUI Core Funktionen",
        info_description: "Multi-Modell-Konsens-Oberfläche",
        info_feature_simple_mode: "Direkte Konversation mit einem einzigen Modell",
        info_feature_consensus_mode: "Mehrere Modelle analysieren deine Anfrage",
        info_feature_multifiles: "Unterstützung für mehrere Dateien gleichzeitig",
        info_feature_sort: "Modelle übersichtlich zur einfachen Auswahl",
        info_feature_edit: "Bearbeite deinen letzten Prompt direkt",
        info_feature_stats: "Verfolge deine Interaktionen",
        info_feature_theme: "Anpassbare Oberfläche",
        info_feature_memory: "Erhaltung des Konversationskontexts",
        info_feature_auth: "Authentifizierung: Sichere Anmeldung und Sitzungsverwaltung",
        info_formats_supported: "Unterstützte Formate:",
        info_formats_text: "Textdateien (.txt, .md)",
        info_formats_code: "Quellcode (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "Daten (.csv)",
        info_formats_office: "Office-Dokumente (.docx, .xlsx, .pdf)",
        info_warning: "Hinweis: Einige kleine Modelle unterstützen keine Dateien",
        nouvelleConversation: "Neue Unterhaltung",
        close_panel: "Panel schließen",
        open_panel: "Panel öffnen",
        andy_status_ready: "Bereit zu helfen",
        andy_welcome: "Hallo! Ich bin Andy, dein Assistent. Wie kann ich dir bei LLMUI Core helfen?",
        andy_thinking: "Andy denkt nach",
        andy_input_placeholder: "Stelle deine Frage...",
        andy_speak_human: "Mit einem Menschen sprechen",
        login_page_title: "LLMUI - Anmeldung",
        login_app_subtitle: "Multi-Modell-Konsens-Oberfläche",
        login_heading: "🔐 Anmeldung",
        login_subtitle: "Melde dich bei deinem LLMUI-Konto an",
        login_username_label: "👤 Benutzername",
        login_username_placeholder: "Gib deinen Benutzernamen ein",
        login_password_label: "🔑 Passwort",
        login_password_placeholder: "Gib dein Passwort ein",
        login_remember_me: "Angemeldet bleiben",
        login_button: "Anmelden",
        login_verify_button: "Bestätigen",
        login_button_loading: "Anmeldung läuft...",
        login_totp_label: "🔢 Bestätigungscode",
        login_totp_placeholder: "123456",
        login_totp_hint: "6-stelliger Code aus deiner Authenticator-App oder ein Wiederherstellungscode.",
        login_forgot_password: "Passwort vergessen?",
        login_version_info: "LLMUI Core v1.0.0 • Sichere Anmeldung",
        totp_setup_heading: "🔐 TOTP-Einrichtung erforderlich",
        totp_setup_desc: "Dein Administratorkonto erfordert eine Zwei-Faktor-Authentifizierung.",
        totp_step1_title: "1. Scanne diesen QR-Code mit deiner Authenticator-App (Google Authenticator, Authy usw.)",
        totp_step1_sub: "Oder gib diesen Schlüssel manuell ein:",
        totp_open_app_link: "In Authenticator-App öffnen",
        totp_step2_title: "2. Bewahre diese Wiederherstellungscodes sicher auf",
        totp_step2_hint: "Jeder Code kann nur einmal verwendet werden, falls du den Zugriff auf deine Authenticator-App verlierst.",
        totp_step3_title: "3. Gib den generierten Code ein, um den Schutz zu aktivieren",
        totp_activate_button: "TOTP aktivieren",
        totp_activate_loading: "Aktivierung läuft...",
        totp_qr_alt: "TOTP-Einrichtungs-QR-Code",
        auth_fill_fields: "Bitte fülle alle Felder aus",
        auth_login_success: "Anmeldung erfolgreich! Weiterleitung...",
        auth_invalid_credentials: "Benutzername oder Passwort falsch",
        auth_invalid_server_response: "Ungültige Serverantwort",
        auth_server_error: "Verbindungsfehler zum Server. Bitte versuche es erneut.",
        auth_totp_enter_code: "Bitte gib deinen Bestätigungscode ein.",
        auth_totp_invalid: "Ungültiger TOTP-Code",
        auth_totp_activated: "TOTP aktiviert! Weiterleitung...",
        auth_totp_setup_failed: "TOTP-Einrichtung konnte nicht initialisiert werden. Bitte versuche es erneut.",
        auth_totp_code_digits: "Der Code muss aus 6 Ziffern bestehen.",
        auth_forgot_password_msg: "Wende dich an den Systemadministrator, um dein Passwort zurückzusetzen."
    },
    pt: {
        subtitle: "Sistema de geração de consenso multimodelo",
        mode_simple: "Simples",
        mode_consensus: "Consenso",
        timeout_level: "Nível de tempo limite",
        timeout_low: "Baixo (15 min)",
        timeout_medium: "Médio (1h)",
        timeout_high: "Alto (4h)",
        timeout_very_high: "Muito alto (4h)",
        select_model: "Modelo",
        loading_models: "A carregar modelos...",
        simple_description: "Escolha o seu LLM e comece a conversar",
        worker_models: "Modelos worker (selecione 2-5)",
        merger_model: "Modelo merger",
        consensus_threshold: "Limiar de consenso",
        preset_fast: "Rápido",
        preset_balanced: "Equilibrado",
        preset_quality: "Qualidade",
        consensus_description: "Vários modelos analisam e combinam as suas respostas",
        welcome_title: "Bem-vindo ao LLMUI Core",
        welcome_msg: "Selecione um modo e comece a conversar com os seus LLMs locais",
        welcome_message: "Bem-vindo ao LLMUI Core! Estou pronto para processar os seus pedidos.",
        attach_files: "Anexar ficheiros",
        files_button: "Ficheiros",
        enter_message: "Escreva a sua mensagem... (Shift+Enter para nova linha)",
        send_btn: "Enviar",
        pause_btn: "Pausar",
        resume_btn: "Retomar",
        clear_btn: "Limpar",
        reload_btn: "Recarregar último",
        stats_title: "Estatísticas",
        total_conversations: "Total de conversas",
        total_messages: "Total de mensagens",
        avg_response_time: "Tempo médio de resposta",
        success_rate: "Taxa de sucesso",
        about_title: "Sobre o LLMUI Core v1.0.0",
        features_title: "Funcionalidades",
        feature_simple: "Modo Simples: Conversa direta com um LLM",
        feature_consensus: "Modo Consenso: Fusão inteligente de vários modelos",
        feature_memory: "Memória híbrida com compressão",
        feature_files: "Suporte multi-ficheiro com arrastar e largar",
        feature_sqlite: "Persistência SQLite",
        feature_ssl: "Suporte SSL/HTTPS",
        author_title: "Autor",
        version_title: "Versão",
        license: "Licença: AGPLv3",
        theme_toggle: "Alternar tema",
        info_btn: "Informação",
        timeout_info: "Tempo limite atual: {simple} (simples) / {consensus} (consenso)",
        file_removed: "Ficheiro removido: {filename}",
        files_cleared: "Todos os ficheiros removidos",
        file_too_large: "Ficheiro demasiado grande: {filename} ({size})",
        total_size_exceeded: "Tamanho total excedido: {total}",
        invalid_extension: "Extensão inválida: {filename}",
        processing: "A processar...",
        processing_consensus: "A gerar consenso...",
        error_occurred: "Ocorreu um erro",
        select_workers: "Selecione pelo menos 2 modelos worker",
        select_merger: "Selecione um modelo merger",
        enter_prompt: "Por favor, escreva uma mensagem",
        cleared_conversation: "Conversa limpa",
        no_last_message: "Sem última mensagem para recarregar",
        last_message_reloaded: "Última mensagem recarregada",
        models_loaded: "Modelos carregados com sucesso",
        stats_updated: "Estatísticas atualizadas",
        mode_switched_simple: "Modo Simples ativado",
        mode_switched_consensus: "Modo Consenso ativado",
        chat_title: "Interface de Consenso",
        chat_subtitle: "Interaja com o coletivo de IA",
        new_conversation: "Limpar a conversa",
        system_ready: "Sistema pronto",
        system_active: "Sistema ativo",
        welcome_system: "Sistema inicializado",
        welcome_models: "modelos disponíveis",
        welcome_ready: "Pronto para o consenso",
        welcome_authenticated: "Sessão autenticada",
        toggle_theme: "Alternar tema",
        toggle_language: "Mudar idioma",
        models_label: "Modelos",
        requests_label: "Pedidos",
        consensus_label: "Consenso",
        avg_time_label: "Tempo médio",
        info_modal_title: "Funcionalidades do LLMUI Core",
        info_description: "Interface de consenso multimodelo",
        info_feature_simple_mode: "Conversa direta com um único modelo",
        info_feature_consensus_mode: "Vários modelos analisam o seu pedido",
        info_feature_multifiles: "Suporte para vários ficheiros em simultâneo",
        info_feature_sort: "Modelos organizados para facilitar a seleção",
        info_feature_edit: "Edite o seu último pedido diretamente",
        info_feature_stats: "Acompanhe as suas interações",
        info_feature_theme: "Interface adaptável",
        info_feature_memory: "Preservação do contexto da conversa",
        info_feature_auth: "Autenticação: Início de sessão seguro e gestão de sessões",
        info_formats_supported: "Formatos suportados:",
        info_formats_text: "Ficheiros de texto (.txt, .md)",
        info_formats_code: "Código-fonte (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "Dados (.csv)",
        info_formats_office: "Documentos de escritório (.docx, .xlsx, .pdf)",
        info_warning: "Nota: Alguns modelos pequenos não suportam ficheiros",
        nouvelleConversation: "Nova conversa",
        close_panel: "Fechar painel",
        open_panel: "Abrir painel",
        andy_status_ready: "Pronto para ajudar",
        andy_welcome: "Olá! Sou o Andy, o seu assistente. Como posso ajudá-lo com o LLMUI Core?",
        andy_thinking: "O Andy está a pensar",
        andy_input_placeholder: "Escreva a sua pergunta...",
        andy_speak_human: "Falar com uma pessoa",
        login_page_title: "LLMUI - Iniciar sessão",
        login_app_subtitle: "Interface de Consenso Multimodelo",
        login_heading: "🔐 Iniciar sessão",
        login_subtitle: "Inicie sessão na sua conta LLMUI",
        login_username_label: "👤 Nome de utilizador",
        login_username_placeholder: "Introduza o seu nome de utilizador",
        login_password_label: "🔑 Palavra-passe",
        login_password_placeholder: "Introduza a sua palavra-passe",
        login_remember_me: "Lembrar-me",
        login_button: "Iniciar sessão",
        login_verify_button: "Verificar",
        login_button_loading: "A iniciar sessão...",
        login_totp_label: "🔢 Código de verificação",
        login_totp_placeholder: "123456",
        login_totp_hint: "Código de 6 dígitos da sua aplicação de autenticação, ou um código de recuperação.",
        login_forgot_password: "Esqueceu-se da palavra-passe?",
        login_version_info: "LLMUI Core v1.0.0 • Acesso seguro",
        totp_setup_heading: "🔐 Configuração TOTP necessária",
        totp_setup_desc: "A sua conta de administrador requer autenticação de dois fatores.",
        totp_step1_title: "1. Digitalize este código QR com a sua aplicação de autenticação (Google Authenticator, Authy, etc.)",
        totp_step1_sub: "Ou introduza esta chave manualmente:",
        totp_open_app_link: "Abrir na aplicação de autenticação",
        totp_step2_title: "2. Guarde estes códigos de recuperação num local seguro",
        totp_step2_hint: "Cada código só pode ser usado uma vez, caso perca o acesso à sua aplicação de autenticação.",
        totp_step3_title: "3. Introduza o código gerado para ativar a proteção",
        totp_activate_button: "Ativar TOTP",
        totp_activate_loading: "A ativar...",
        totp_qr_alt: "Código QR de configuração TOTP",
        auth_fill_fields: "Por favor, preencha todos os campos",
        auth_login_success: "Sessão iniciada com sucesso! A redirecionar...",
        auth_invalid_credentials: "Nome de utilizador ou palavra-passe incorretos",
        auth_invalid_server_response: "Resposta inválida do servidor",
        auth_server_error: "Erro de ligação ao servidor. Tente novamente.",
        auth_totp_enter_code: "Por favor, introduza o seu código de verificação.",
        auth_totp_invalid: "Código TOTP inválido",
        auth_totp_activated: "TOTP ativado! A redirecionar...",
        auth_totp_setup_failed: "Não foi possível inicializar a configuração TOTP. Tente novamente.",
        auth_totp_code_digits: "O código deve conter 6 dígitos.",
        auth_forgot_password_msg: "Contacte o administrador do sistema para repor a sua palavra-passe."
    },
    ar: {
        subtitle: "نظام توليد التوافق متعدد النماذج",
        mode_simple: "بسيط",
        mode_consensus: "توافق",
        timeout_level: "مستوى المهلة",
        timeout_low: "منخفض (15 دقيقة)",
        timeout_medium: "متوسط (ساعة واحدة)",
        timeout_high: "مرتفع (4 ساعات)",
        timeout_very_high: "مرتفع جدًا (4 ساعات)",
        select_model: "النموذج",
        loading_models: "جارٍ تحميل النماذج...",
        simple_description: "اختر نموذج LLM وابدأ المحادثة",
        worker_models: "النماذج العاملة (اختر 2-5)",
        merger_model: "نموذج الدمج",
        consensus_threshold: "عتبة التوافق",
        preset_fast: "سريع",
        preset_balanced: "متوازن",
        preset_quality: "جودة",
        consensus_description: "تقوم عدة نماذج بتحليل ودمج إجاباتها",
        welcome_title: "مرحبًا بك في LLMUI Core",
        welcome_msg: "اختر نمطًا وابدأ المحادثة مع نماذجك المحلية",
        welcome_message: "مرحبًا بك في LLMUI Core! أنا جاهز لمعالجة طلباتك.",
        attach_files: "إرفاق ملفات",
        files_button: "ملفات",
        enter_message: "اكتب رسالتك... (Shift+Enter لسطر جديد)",
        send_btn: "إرسال",
        pause_btn: "إيقاف مؤقت",
        resume_btn: "استئناف",
        clear_btn: "مسح",
        reload_btn: "إعادة تحميل الأخير",
        stats_title: "الإحصائيات",
        total_conversations: "إجمالي المحادثات",
        total_messages: "إجمالي الرسائل",
        avg_response_time: "متوسط وقت الاستجابة",
        success_rate: "معدل النجاح",
        about_title: "حول LLMUI Core v1.0.0",
        features_title: "الميزات",
        feature_simple: "النمط البسيط: محادثة مباشرة مع نموذج واحد",
        feature_consensus: "نمط التوافق: دمج ذكي لعدة نماذج",
        feature_memory: "ذاكرة هجينة مع ضغط",
        feature_files: "دعم ملفات متعددة بالسحب والإفلات",
        feature_sqlite: "تخزين دائم باستخدام SQLite",
        feature_ssl: "دعم SSL/HTTPS",
        author_title: "المؤلف",
        version_title: "الإصدار",
        license: "الترخيص: AGPLv3",
        theme_toggle: "تبديل المظهر",
        info_btn: "معلومات",
        timeout_info: "المهلة الحالية: {simple} (بسيط) / {consensus} (توافق)",
        file_removed: "تم حذف الملف: {filename}",
        files_cleared: "تم حذف جميع الملفات",
        file_too_large: "الملف كبير جدًا: {filename} ({size})",
        total_size_exceeded: "تم تجاوز الحجم الإجمالي: {total}",
        invalid_extension: "امتداد غير صالح: {filename}",
        processing: "جارٍ المعالجة...",
        processing_consensus: "جارٍ توليد التوافق...",
        error_occurred: "حدث خطأ",
        select_workers: "اختر على الأقل نموذجين عاملين",
        select_merger: "اختر نموذج دمج",
        enter_prompt: "يرجى كتابة رسالة",
        cleared_conversation: "تم مسح المحادثة",
        no_last_message: "لا توجد رسالة أخيرة لإعادة تحميلها",
        last_message_reloaded: "تمت إعادة تحميل الرسالة الأخيرة",
        models_loaded: "تم تحميل النماذج بنجاح",
        stats_updated: "تم تحديث الإحصائيات",
        mode_switched_simple: "تم تفعيل النمط البسيط",
        mode_switched_consensus: "تم تفعيل نمط التوافق",
        chat_title: "واجهة التوافق",
        chat_subtitle: "تفاعل مع مجموعة الذكاء الاصطناعي",
        new_conversation: "مسح المحادثة",
        system_ready: "النظام جاهز",
        system_active: "النظام نشط",
        welcome_system: "تم تهيئة النظام",
        welcome_models: "نماذج متاحة",
        welcome_ready: "جاهز للتوافق",
        welcome_authenticated: "تم تسجيل الدخول إلى الجلسة",
        toggle_theme: "تبديل المظهر",
        toggle_language: "تغيير اللغة",
        models_label: "النماذج",
        requests_label: "الطلبات",
        consensus_label: "التوافق",
        avg_time_label: "الوقت المتوسط",
        info_modal_title: "ميزات LLMUI Core",
        info_description: "واجهة توافق متعددة النماذج",
        info_feature_simple_mode: "محادثة مباشرة مع نموذج واحد",
        info_feature_consensus_mode: "عدة نماذج تحلل طلبك",
        info_feature_multifiles: "دعم لعدة ملفات في الوقت نفسه",
        info_feature_sort: "نماذج منظمة لتسهيل الاختيار",
        info_feature_edit: "تعديل آخر طلب لك مباشرة",
        info_feature_stats: "تتبع تفاعلاتك",
        info_feature_theme: "واجهة قابلة للتكيف",
        info_feature_memory: "الحفاظ على سياق المحادثة",
        info_feature_auth: "المصادقة: تسجيل دخول آمن وإدارة الجلسات",
        info_formats_supported: "الصيغ المدعومة:",
        info_formats_text: "ملفات نصية (.txt, .md)",
        info_formats_code: "كود المصدر (.py, .js, .json, .sh, .css, .html, .xml, .yaml, .yml)",
        info_formats_data: "بيانات (.csv)",
        info_formats_office: "ملفات مكتبية (.docx, .xlsx, .pdf)",
        info_warning: "ملاحظة: بعض النماذج الصغيرة لا تدعم الملفات",
        nouvelleConversation: "محادثة جديدة",
        close_panel: "إغلاق اللوحة",
        open_panel: "فتح اللوحة",
        andy_status_ready: "جاهز للمساعدة",
        andy_welcome: "مرحبًا! أنا آندي، مساعدك. كيف يمكنني مساعدتك في LLMUI Core؟",
        andy_thinking: "آندي يفكر",
        andy_input_placeholder: "اكتب سؤالك...",
        andy_speak_human: "التحدث مع شخص",
        login_page_title: "LLMUI - تسجيل الدخول",
        login_app_subtitle: "واجهة التوافق متعددة النماذج",
        login_heading: "🔐 تسجيل الدخول",
        login_subtitle: "سجّل الدخول إلى حساب LLMUI الخاص بك",
        login_username_label: "👤 اسم المستخدم",
        login_username_placeholder: "أدخل اسم المستخدم",
        login_password_label: "🔑 كلمة المرور",
        login_password_placeholder: "أدخل كلمة المرور",
        login_remember_me: "تذكرني",
        login_button: "تسجيل الدخول",
        login_verify_button: "تحقق",
        login_button_loading: "جارٍ تسجيل الدخول...",
        login_totp_label: "🔢 رمز التحقق",
        login_totp_placeholder: "123456",
        login_totp_hint: "رمز مكوّن من 6 أرقام من تطبيق المصادقة، أو رمز استرداد.",
        login_forgot_password: "هل نسيت كلمة المرور؟",
        login_version_info: "LLMUI Core v1.0.0 • تسجيل دخول آمن",
        totp_setup_heading: "🔐 إعداد TOTP مطلوب",
        totp_setup_desc: "يتطلب حساب المسؤول الخاص بك مصادقة ثنائية العامل.",
        totp_step1_title: "1. امسح رمز QR هذا باستخدام تطبيق المصادقة (Google Authenticator وAuthy وغيرها)",
        totp_step1_sub: "أو أدخل هذا المفتاح يدويًا:",
        totp_open_app_link: "فتح في تطبيق المصادقة",
        totp_step2_title: "2. احتفظ برموز الاسترداد هذه في مكان آمن",
        totp_step2_hint: "يمكن استخدام كل رمز مرة واحدة فقط في حال فقدان الوصول إلى تطبيق المصادقة.",
        totp_step3_title: "3. أدخل الرمز الذي تم إنشاؤه لتفعيل الحماية",
        totp_activate_button: "تفعيل TOTP",
        totp_activate_loading: "جارٍ التفعيل...",
        totp_qr_alt: "رمز QR لإعداد TOTP",
        auth_fill_fields: "يرجى تعبئة جميع الحقول",
        auth_login_success: "تم تسجيل الدخول بنجاح! جارٍ إعادة التوجيه...",
        auth_invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
        auth_invalid_server_response: "استجابة غير صالحة من الخادم",
        auth_server_error: "خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
        auth_totp_enter_code: "يرجى إدخال رمز التحقق الخاص بك.",
        auth_totp_invalid: "رمز TOTP غير صالح",
        auth_totp_activated: "تم تفعيل TOTP! جارٍ إعادة التوجيه...",
        auth_totp_setup_failed: "تعذّر تهيئة إعداد TOTP. يرجى المحاولة مرة أخرى.",
        auth_totp_code_digits: "يجب أن يتكون الرمز من 6 أرقام.",
        auth_forgot_password_msg: "تواصل مع مسؤول النظام لإعادة تعيين كلمة المرور."
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('llmui_lang') || 'fr';
        this.translations = translations;
        this.languages = LANGUAGES;

        // Apply <html lang>/<html dir> immediately based on stored preference
        this.applyDirection();

        // Build dropdown(s) and sync flag/text on load
        this.initLanguageSelectors();
    }

    // Update <html lang> and <html dir> (RTL for Arabic) for the current language
    applyDirection() {
        const lang = this.languages.find(l => l.code === this.currentLang) || this.languages[0];
        document.documentElement.lang = lang.code;
        document.documentElement.dir = lang.dir;
    }

    // Populate every .lang-selector dropdown on the page and wire up open/close + selection
    initLanguageSelectors() {
        document.querySelectorAll('.lang-selector').forEach(selector => {
            const toggle = selector.querySelector('.lang-toggle');
            const dropdown = selector.querySelector('.lang-dropdown');
            if (!toggle || !dropdown) return;

            dropdown.innerHTML = '';
            this.languages.forEach(lang => {
                const li = document.createElement('li');
                li.setAttribute('role', 'option');

                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'lang-option';
                option.dataset.lang = lang.code;
                option.setAttribute('aria-label', lang.name);
                option.innerHTML = `<span class="lang-option-flag">${lang.flag}</span><span class="lang-option-name">${lang.name}</span>`;
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.setLanguage(lang.code);
                    this.closeDropdown(selector);
                });

                li.appendChild(option);
                dropdown.appendChild(li);
            });

            toggle.setAttribute('aria-haspopup', 'listbox');
            toggle.setAttribute('aria-expanded', 'false');

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const willOpen = !dropdown.classList.contains('open');
                document.querySelectorAll('.lang-selector').forEach(s => this.closeDropdown(s));
                if (willOpen) {
                    dropdown.classList.add('open');
                    toggle.setAttribute('aria-expanded', 'true');
                }
            });
        });

        // Close any open dropdown when clicking outside or pressing Escape
        document.addEventListener('click', () => {
            document.querySelectorAll('.lang-selector').forEach(s => this.closeDropdown(s));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.lang-selector').forEach(s => this.closeDropdown(s));
            }
        });

        this.updateLanguageButtons();
    }

    closeDropdown(selector) {
        const toggle = selector.querySelector('.lang-toggle');
        const dropdown = selector.querySelector('.lang-dropdown');
        if (dropdown) dropdown.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    // Sync flag/code and highlight the active option on every selector on the page
    updateLanguageButtons() {
        const current = this.languages.find(l => l.code === this.currentLang) || this.languages[0];

        document.querySelectorAll('.lang-selector').forEach(selector => {
            const flagEl = selector.querySelector('#langFlag, .lang-flag');
            const textEl = selector.querySelector('#langText, .lang-text');
            if (flagEl) flagEl.textContent = current.flag;
            if (textEl) textEl.textContent = current.code.toUpperCase();

            selector.querySelectorAll('.lang-option').forEach(option => {
                option.classList.toggle('active', option.dataset.lang === current.code);
            });
        });
    }

    // Set language and update entire UI
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error(`Language ${lang} not supported`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('llmui_lang', lang);

        this.applyDirection();
        this.updateUI();
        this.updateLanguageButtons();

        // Let other modules (e.g. app.js timeout info) refresh language-dependent text
        document.dispatchEvent(new CustomEvent('llmui:languagechange', { detail: { lang } }));
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

        // Update all elements with data-i18n-alt
        document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const key = el.getAttribute('data-i18n-alt');
            el.alt = this.t(key);
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

        // Update browser tab title on the login page
        if (document.getElementById('loginForm')) {
            document.title = this.t('login_page_title');
        }
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
