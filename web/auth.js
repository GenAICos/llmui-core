/**
 * LLMUI Authentication Script
 * Handles login functionality and session management
 * Version: v1.0.0
 */

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Internationalization
        this.i18n = new I18n();
        this.i18n.updateUI();

        // Theme management
        this.loadTheme();
        this.setupThemeToggle();

        // Password visibility toggle
        this.setupPasswordToggle();

        // Form submission
        this.setupFormSubmission();

        // Configuration TOTP (H-05)
        this.setupTotpHandlers();

        // Check if already logged in
        this.checkExistingSession();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('llmui_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.textContent = '☀️';
            }
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-theme');
                const isLight = document.body.classList.contains('light-theme');
                localStorage.setItem('llmui_theme', isLight ? 'light' : 'dark');
                themeToggle.textContent = isLight ? '☀️' : '🌙';
            });
        }
    }

    setupPasswordToggle() {
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }
    }

    setupFormSubmission() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Handle forgot password
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAlert('info', this.i18n.t('auth_forgot_password_msg'));
            });
        }
    }

    setupTotpHandlers() {
        // Copier la clé secrète TOTP dans le presse-papiers
        const copyButton = document.getElementById('copyTotpSecret');
        const totpSecret = document.getElementById('totpSecret');
        if (copyButton && totpSecret) {
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(totpSecret.textContent);
                    const original = copyButton.textContent;
                    copyButton.textContent = '✅';
                    setTimeout(() => {
                        copyButton.textContent = original;
                    }, 1500);
                } catch (error) {
                    console.error('Erreur lors de la copie de la clé TOTP:', error);
                }
            });
        }

        // Confirmation de l'activation TOTP
        const activateButton = document.getElementById('totpActivateButton');
        if (activateButton) {
            activateButton.addEventListener('click', () => {
                this.handleTotpActivate();
            });
        }

        const activateCode = document.getElementById('totpActivateCode');
        if (activateCode) {
            activateCode.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTotpActivate();
                }
            });
        }
    }

    async checkExistingSession() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data.authenticated) {
                        // Already logged in, redirect to main interface
                        window.location.href = '/index.html';
                    }
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const totpInput = document.getElementById('totpCode');
        const totpCode = totpInput ? totpInput.value.trim() : '';
        const loginButton = document.getElementById('loginButton');

        // Validation
        if (!username || !password) {
            this.showAlert('error', this.i18n.t('auth_fill_fields'));
            return;
        }

        // Disable button and show loading
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="loading-spinner"></span>' + this.i18n.t('login_button_loading');

        try {
            const credentials = { username, password, rememberMe };
            if (totpCode) {
                credentials.totpCode = totpCode;
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(credentials)
            });

            // Vérifier le Content-Type pour savoir comment parser la réponse
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                // Réponse JSON
                data = await response.json();
            } else {
                // Réponse non-JSON (probablement texte brut ou HTML)
                const text = await response.text();
                console.warn('Réponse non-JSON reçue:', text);
                data = {
                    success: false,
                    message: response.ok ? this.i18n.t('auth_invalid_server_response') : this.i18n.t('auth_invalid_credentials')
                };
            }

            if (response.ok && data.success) {
                // Login successful (200 OK)
                this.showAlert('success', this.i18n.t('auth_login_success'));

                // Store user info in localStorage if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('llmui_username', username);
                }

                // Redirect to main interface after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
                return;
            }

            // Configuration TOTP requise (premier login admin) — H-05
            if (data.totp_setup_required) {
                await this.startTotpSetup();
                this.resetLoginButton(loginButton);
                return;
            }

            // Code TOTP requis (admin déjà configuré) — H-05
            if (data.totp_required) {
                this.showTotpInput();
                this.showAlert('error', data.message || this.i18n.t('auth_totp_enter_code'));
                this.resetLoginButton(loginButton);
                return;
            }

            // Login failed
            const message = data.message || this.i18n.t('auth_invalid_credentials');
            this.showAlert('error', message);
            this.resetLoginButton(loginButton);
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('error', this.i18n.t('auth_server_error'));
            this.resetLoginButton(loginButton);
        }
    }

    resetLoginButton(loginButton) {
        const totpGroup = document.getElementById('totpGroup');
        const totpVisible = totpGroup && !totpGroup.classList.contains('hidden');
        loginButton.disabled = false;
        loginButton.innerHTML = totpVisible ? this.i18n.t('login_verify_button') : this.i18n.t('login_button');
    }

    showTotpInput() {
        const totpGroup = document.getElementById('totpGroup');
        const totpInput = document.getElementById('totpCode');
        if (totpGroup) {
            totpGroup.classList.remove('hidden');
        }
        if (totpInput) {
            totpInput.focus();
        }
    }

    async startTotpSetup() {
        try {
            const response = await fetch('/api/auth/totp/setup', {
                method: 'POST',
                credentials: 'include'
            });

            const contentType = response.headers.get('content-type');
            const data = (contentType && contentType.includes('application/json'))
                ? await response.json()
                : null;

            if (!response.ok || !data || !data.success) {
                this.showAlert('error', this.i18n.t('auth_totp_setup_failed'));
                return;
            }

            this.displayTotpSetup(data);
        } catch (error) {
            console.error('TOTP setup error:', error);
            this.showAlert('error', this.i18n.t('auth_server_error'));
        }
    }

    displayTotpSetup(data) {
        const loginForm = document.getElementById('loginForm');
        const footerLinks = document.querySelector('.footer-links');
        const totpSetup = document.getElementById('totpSetup');
        const totpSecret = document.getElementById('totpSecret');
        const totpUriLink = document.getElementById('totpUriLink');
        const totpQrBox = document.getElementById('totpQrBox');
        const totpQrCode = document.getElementById('totpQrCode');
        const recoveryList = document.getElementById('totpRecoveryCodes');

        // QR code : affiché s'il a été généré côté serveur (data URI SVG),
        // sinon on masque la boîte et l'utilisateur saisit la clé manuellement.
        if (totpQrBox && totpQrCode) {
            if (data.qr_code) {
                totpQrCode.src = data.qr_code;
                totpQrBox.classList.remove('hidden');
            } else {
                totpQrBox.classList.add('hidden');
            }
        }
        if (totpSecret) {
            totpSecret.textContent = data.secret;
        }
        if (totpUriLink) {
            totpUriLink.href = data.otpauth_uri;
        }
        if (recoveryList) {
            recoveryList.innerHTML = '';
            (data.recovery_codes || []).forEach(code => {
                const li = document.createElement('li');
                li.textContent = code;
                recoveryList.appendChild(li);
            });
        }

        if (loginForm) {
            loginForm.classList.add('hidden');
        }
        if (footerLinks) {
            footerLinks.classList.add('hidden');
        }
        if (totpSetup) {
            totpSetup.classList.remove('hidden');
        }
    }

    async handleTotpActivate() {
        const codeInput = document.getElementById('totpActivateCode');
        const activateButton = document.getElementById('totpActivateButton');
        const code = codeInput ? codeInput.value.trim() : '';

        if (!/^\d{6}$/.test(code)) {
            this.showAlert('error', this.i18n.t('auth_totp_code_digits'));
            return;
        }

        activateButton.disabled = true;
        activateButton.innerHTML = '<span class="loading-spinner"></span>' + this.i18n.t('totp_activate_loading');

        try {
            const response = await fetch('/api/auth/totp/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ code })
            });

            const contentType = response.headers.get('content-type');
            const data = (contentType && contentType.includes('application/json'))
                ? await response.json()
                : null;

            if (response.ok && data && data.success) {
                this.showAlert('success', this.i18n.t('auth_totp_activated'));
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
                return;
            }

            const message = (data && (data.message || data.detail)) || this.i18n.t('auth_totp_invalid');
            this.showAlert('error', message);
            activateButton.disabled = false;
            activateButton.innerHTML = this.i18n.t('totp_activate_button');
        } catch (error) {
            console.error('TOTP activate error:', error);
            this.showAlert('error', this.i18n.t('auth_server_error'));
            activateButton.disabled = false;
            activateButton.innerHTML = this.i18n.t('totp_activate_button');
        }
    }

    showAlert(type, message) {
        // Hide all alerts first
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => alert.classList.remove('show'));

        // Show appropriate alert
        let alertElement, messageElement;
        if (type === 'error') {
            alertElement = document.getElementById('errorAlert');
            messageElement = document.getElementById('errorMessage');
        } else if (type === 'success') {
            alertElement = document.getElementById('successAlert');
            messageElement = document.getElementById('successMessage');
        } else {
            // For info messages, use error alert with info styling
            alertElement = document.getElementById('errorAlert');
            messageElement = document.getElementById('errorMessage');
        }

        if (alertElement && messageElement) {
            messageElement.textContent = message;
            alertElement.classList.add('show');

            // Auto-hide after 5 seconds (except for success messages)
            if (type !== 'success') {
                setTimeout(() => {
                    alertElement.classList.remove('show');
                }, 5000);
            }
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();

    // Pre-fill username if remembered
    const rememberedUsername = localStorage.getItem('llmui_username');
    if (rememberedUsername) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = rememberedUsername;
            document.getElementById('rememberMe').checked = true;
        }
    }
});
