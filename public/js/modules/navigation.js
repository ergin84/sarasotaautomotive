// Navigation Module
import { authToken } from './auth.js';

export let currentPage = 'home';

export function initializeNavigation() {
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
                await showPage(pageId);
                updateActiveNav(link);
                closeSidebar();
            }
        });
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            showPage(hash);
        }
    });
}

export async function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        currentPage = pageId;
        
        // Dynamic imports for specific pages
        try {
            switch(pageId) {
                case 'sale':
                case 'inventory-sale':
                    const { loadCarsForSale } = await import('./cars.js');
                    await loadCarsForSale();
                    break;
                case 'rent':
                case 'inventory-rent':
                    const { loadCarsForRent } = await import('./cars.js');
                    await loadCarsForRent();
                    break;
                case 'services':
                    const { loadPublicServices } = await import('./services.js');
                    await loadPublicServices();
                    break;
                case 'privacy-policy':
                    const { loadPrivacyPolicy } = await import('./site-settings.js');
                    await loadPrivacyPolicy();
                    break;
            }
            
            // Admin pages - lazy load
            if (pageId.startsWith('admin-') && authToken) {
                const admin = await import('./admin.js');
                await admin.handleAdminPage(pageId);
            }
        } catch (error) {
            console.error(`Error loading page ${pageId}:`, error);
        }
    }

    window.location.hash = pageId;
}

export function updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink?.classList.add('active');
}

export function updateActiveNavForPage(pageId) {
    const navLink = document.querySelector(`[data-page="${pageId}"]`);
    if (navLink) {
        updateActiveNav(navLink);
    }
}

export function loadInitialPage() {
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
