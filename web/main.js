/*
 * LLMUI Core v2.0 - Initialization
 * Author: François Chalut
 * Website: https://llmui.org
 */
// Correction spécifique pour 1366x768
function fix1366x768Layout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Détection spécifique 1366x768
    if (width === 1366 && height === 768) {
        console.log('Détection écran 1366x768 - Application des correctifs');
        
        // Force le recalcul des hauteurs
        const mainContent = document.getElementById('mainContent');
        const messagesContainer = document.getElementById('messagesContainer');
        const chatPanel = document.getElementById('chatPanel');
        
        if (mainContent && chatPanel) {
            // Ajustement des hauteurs
            const availableHeight = window.innerHeight - 80; // Header approx
            mainContent.style.height = availableHeight + 'px';
            chatPanel.style.height = '100%';
            
            if (messagesContainer) {
                messagesContainer.style.maxHeight = (availableHeight - 200) + 'px';
            }
        }
        
        // Correction du bouton langue
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.style.display = 'flex';
            langToggle.style.alignItems = 'center';
            langToggle.style.gap = '4px';
        }
    }
}

// Exécuter au chargement et au redimensionnement
document.addEventListener('DOMContentLoaded', fix1366x768Layout);
window.addEventListener('resize', fix1366x768Layout);
window.addEventListener('load', fix1366x768Layout);

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LLMUIApp();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = '☀️';
        }
    }
});