/**
 * LLMUI Session Guard
 * Protects the main interface and handles authentication state
 * Include this script at the top of index.html
 */

(function() {
    'use strict';

    // Check authentication status before loading the app
    async function checkAuthentication() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok || response.status === 401) {
                // Not authenticated, redirect to login
                window.location.href = '/login.html';
                return false;
            }

            const data = await response.json();
            if (!data.authenticated) {
                window.location.href = '/login.html';
                return false;
            }

            // Store user info
            sessionStorage.setItem('llmui_user', JSON.stringify(data.user));
            
            // Add logout functionality
            setupLogoutButton();
            
            // Display user info in header
            displayUserInfo(data.user);

            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login.html';
            return false;
        }
    }

    function setupLogoutButton() {
        // Create logout button if it doesn't exist
        const headerControls = document.querySelector('.header-controls');
        if (headerControls && !document.getElementById('logoutBtn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'logout-btn';
            logoutBtn.textContent = '🚪 Déconnexion';
            logoutBtn.title = 'Se déconnecter';

            logoutBtn.addEventListener('click', handleLogout);
            
            // Insert before theme toggle
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                headerControls.insertBefore(logoutBtn, themeToggle);
            } else {
                headerControls.appendChild(logoutBtn);
            }
        }
    }

    function displayUserInfo(user) {
        const statusText = document.getElementById('statusText');
        if (statusText && user) {
            // C-03 : textContent pour éviter l'injection HTML via user.username
            statusText.textContent = `👤 ${user.username} • Système Actif`;
        }
    }

    async function handleLogout() {
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                // Clear session storage
                sessionStorage.removeItem('llmui_user');
                
                // Redirect to login
                window.location.href = '/login.html';
            } else {
                alert('Erreur lors de la déconnexion');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Erreur lors de la déconnexion');
        }
    }

    // Auto-refresh session every 5 minutes to keep it alive
    function startSessionRefresh() {
        setInterval(async () => {
            try {
                await fetch('/api/auth/verify', {
                    method: 'GET',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Session refresh failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Initialize authentication check
    document.addEventListener('DOMContentLoaded', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            startSessionRefresh();
        }
    });

    // Handle session expiration
    window.addEventListener('storage', (e) => {
        if (e.key === 'llmui_logout' && e.newValue) {
            // Logout event from another tab
            window.location.href = '/login.html';
        }
    });

    // Export logout function for use in other scripts
    window.llmuiLogout = handleLogout;

})();
