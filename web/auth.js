/**
 * LLMUI Authentication Script
 * Handles login functionality and session management
 */

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Theme management
        this.loadTheme();
        this.setupThemeToggle();
        
        // Password visibility toggle
        this.setupPasswordToggle();
        
        // Form submission
        this.setupFormSubmission();
        
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
                this.showAlert('info', 'Contactez l\'administrateur système pour réinitialiser votre mot de passe.');
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
                const data = await response.json();
                if (data.authenticated) {
                    // Already logged in, redirect to main interface
                    window.location.href = '/index.html';
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
        const loginButton = document.getElementById('loginButton');

        // Validation
        if (!username || !password) {
            this.showAlert('error', 'Veuillez remplir tous les champs');
            return;
        }

        // Disable button and show loading
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="loading-spinner"></span>Connexion en cours...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login successful
                this.showAlert('success', 'Connexion réussie ! Redirection...');
                
                // Store user info in localStorage if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('llmui_username', username);
                }

                // Redirect to main interface after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
            } else {
                // Login failed
                // Utiliser data.message si disponible, sinon un message générique basé sur la réponse
                const message = data.message || 'Nom d\'utilisateur ou mot de passe incorrect';
                this.showAlert('error', message);
                loginButton.disabled = false;
                loginButton.innerHTML = 'Se connecter';
            }
        } catch (error) {
            console.error('Login error:', error);
            // CORRECTION: Assurer que le bouton est réactivé en cas d'erreur réseau
            this.showAlert('error', 'Erreur de connexion au serveur. Veuillez réessayer.');
            loginButton.disabled = false;
            loginButton.innerHTML = 'Se connecter';
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
