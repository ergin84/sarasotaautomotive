/**
 * Sarasota Automotive - Main Entry Point
 * Modular ES6 Architecture
 */

// Import core modules
import { verifySession, updateFooterUserInfo } from './modules/auth.js';
import { initializeLightbox } from './modules/lightbox.js';

// Global state
let currentPage = 'home';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚗 Sarasota Automotive - Loading...');
    
    // Verify session
    await verifySession();
    updateFooterUserInfo();
    
    // Initialize core modules
    initializeLightbox();
    await initializeNavigation();
    await initializeCookieConsent();
    await initializeModals();
    
    // Load initial page
    loadInitialPage();
    
    console.log('✅ App initialized');
});

// Navigation initialization (will be moved to navigation.js module)
async function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        const isOpen = sidebar?.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        sidebar?.classList.add('open');
        sidebarOverlay?.classList.add('active');
        menuToggle?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
        menuToggle?.classList.remove('active');
        document.body.style.overflow = '';
    }

    menuToggle?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            if (pageId) {
                // Lazy load page module
                await showPage(pageId);
                updateActiveNav(link);
                closeSidebar();
            }
        });
    });
}

// Cookie consent (will be moved to separate module)
async function initializeCookieConsent() {
    // Placeholder - full implementation in app.js
    console.log('Cookie consent initialized');
}

// Modals (will be moved to separate module)
async function initializeModals() {
    // Placeholder - full implementation in app.js
    console.log('Modals initialized');
}

// Show page with lazy loading
async function showPage(pageId) {
    console.log(`Loading page: ${pageId}`);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        currentPage = pageId;
        
        // Lazy load page-specific modules
        try {
            switch(pageId) {
                case 'sale':
                    const { loadCarsForSale } = await import('../app.js');
                    await loadCarsForSale();
                    break;
                case 'rent':
                    const { loadCarsForRent } = await import('../app.js');
                    await loadCarsForRent();
                    break;
                case 'services':
                    const { loadPublicServices } = await import('../app.js');
                    await loadPublicServices();
                    break;
                case 'admin-dashboard':
                    // Lazy load admin module only when needed
                    const { loadAdminDashboard } = await import('../app.js');
                    await loadAdminDashboard();
                    break;
                case 'privacy-policy':
                    const { loadPrivacyPolicy } = await import('../app.js');
                    await loadPrivacyPolicy();
                    break;
            }
        } catch (error) {
            console.error(`Error loading page ${pageId}:`, error);
        }
    }

    // Update URL hash
    window.location.hash = pageId;
}

// Update active navigation
function updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink?.classList.add('active');
}

// Load initial page from URL hash or default
function loadInitialPage() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const navLink = document.querySelector(`[data-page="${hash}"]`);
        if (navLink) {
            navLink.click();
        } else {
            showPage(hash);
        }
    } else {
        showPage('home');
    }
}

// Export for window object (temporary compatibility)
window.showPage = showPage;
