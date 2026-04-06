// Navigation Module
import { appState } from './constants.js';

// Page loader registry (populated by main.js to break circular deps)
let pageLoaders = {};

export function registerPageLoaders(loaders) {
    pageLoaders = loaders || {};
}

export function formatCarStatus(status) {
    if (status === 'sold') return 'SOLD OUT';
    if (status === 'coming_soon') return 'COMING SOON';
    if (status === 'pending') return 'PENDING';
    return (status || '').toUpperCase();
}

export function formatCurrency(value) {
    if (value === null || value === undefined || value === '') {
        return 'Price not set';
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return value;
    }
    return `$${number.toLocaleString()}`;
}

export function formatRequestStatusLabel(status) {
    const REQUEST_STATUS_OPTIONS = [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Client contacted' },
        { value: 'ongoing', label: 'Ongoing process' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'closed', label: 'Closed' }
    ];
    const option = REQUEST_STATUS_OPTIONS.find(opt => opt.value === status);
    if (option) {
        return option.label;
    }
    if (status === 'pending') return 'New';
    if (status === 'completed') return 'Closed';
    return status || '';
}

export function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Toggle body class for home page
    if (pageId === 'home') {
        document.body.classList.add('home-page-active');
    } else {
        document.body.classList.remove('home-page-active');
    }

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = pageId;

        // Update URL hash to persist page on refresh
        if (pageId === 'home') {
            if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        } else {
            if (window.location.hash.slice(1) !== pageId) {
                window.location.hash = pageId;
            }
        }

        // Load page-specific content via registry
        if (pageId === 'inventory-sale' && pageLoaders['inventory-sale']) {
            pageLoaders['inventory-sale']();
        } else if (pageId === 'inventory-rent' && pageLoaders['inventory-rent']) {
            pageLoaders['inventory-rent']();
        } else if (pageId === 'services' && pageLoaders['services']) {
            pageLoaders['services']();
        } else if (pageId === 'admin-dashboard' && appState.authToken && pageLoaders['admin']) {
            pageLoaders['admin']();
        } else if (pageId === 'privacy' && pageLoaders['privacy']) {
            pageLoaders['privacy']();
        }
    }
}

export function updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

export function loadInitialPage() {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
        if (hash === 'admin-dashboard' || hash === 'admin-login') {
            if (hash === 'admin-dashboard' && !appState.authToken) {
                showPage('admin-login');
                updateActiveNavForPage('admin-login');
            } else {
                showPage(hash);
                updateActiveNavForPage(hash);
            }
        } else {
            showPage(hash);
            updateActiveNavForPage(hash);
        }
    } else {
        showPage('home');
        updateActiveNavForPage('home');
    }
}

export function updateActiveNavForPage(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
}

export function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.add('open');
        menuToggle.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
        const firstFocusable = sidebar.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) firstFocusable.focus();
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const page = link.getAttribute('data-page');
            if (page) {
                if (page === 'admin-dashboard' && !appState.authToken) {
                    showPage('admin-login');
                } else {
                    showPage(page);
                }
                updateActiveNav(link);
            }
            if (document.body.classList.contains('menu-open') && window.matchMedia('(max-width: 1024px)').matches) {
                closeSidebar();
            }
        });
    });

    // Footer static links (privacy, home badge, etc.)
    const footerStaticLinks = document.querySelectorAll('.sidebar-footer [data-page]:not(.admin-link)');
    footerStaticLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const page = link.getAttribute('data-page');
            if (!page) return;

            if (page === 'admin-dashboard' && !appState.authToken) {
                showPage('admin-login');
                updateActiveNavForPage('admin-login');
            } else {
                showPage(page);
                updateActiveNavForPage(page);
            }
            if (document.body.classList.contains('menu-open') && window.matchMedia('(max-width: 1024px)').matches) {
                closeSidebar();
            }
        });
    });

    // Services contact button
    const servicesContactButton = document.querySelector('.services-contact-button');
    if (servicesContactButton) {
        servicesContactButton.addEventListener('click', (e) => {
            e.preventDefault();
            const page = servicesContactButton.getAttribute('data-page');
            if (page) {
                showPage(page);
                const contactNavLink = document.querySelector('[data-page="contact"]');
                if (contactNavLink && contactNavLink.classList.contains('nav-link')) {
                    updateActiveNav(contactNavLink);
                }
            }
        });
    }

    // Bring me here (Google Maps directions)
    const bringMeHereBtn = document.getElementById('bringMeHereBtn');
    if (bringMeHereBtn) {
        bringMeHereBtn.addEventListener('click', () => {
            const explicitAddress = bringMeHereBtn.getAttribute('data-address') || '';
            const displayedAddress = document.getElementById('contactAddress')?.textContent || '';
            const address = (explicitAddress || displayedAddress || '').trim();

            if (!address) {
                console.warn('Bring me here clicked, but no address is set.');
                return;
            }

            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
            window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        });
    }

    let lastTouchTime = 0;

    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    menuToggle?.addEventListener('touchstart', () => {
        lastTouchTime = Date.now();
    }, { passive: true });

    let menuHoverTimeout = null;

    menuToggle?.addEventListener('mouseenter', () => {
        if (Date.now() - lastTouchTime < 500) {
            return;
        }
        if (menuHoverTimeout) {
            clearTimeout(menuHoverTimeout);
            menuHoverTimeout = null;
        }
        if (!document.body.classList.contains('menu-open')) {
            openSidebar();
        }
    });

    function handleMenuMouseLeave() {
        if (Date.now() - lastTouchTime < 500) {
            return;
        }
        menuHoverTimeout = setTimeout(() => {
            if (document.body.classList.contains('menu-open')) {
                closeSidebar();
            }
            menuHoverTimeout = null;
        }, 150);
    }

    function handleMenuMouseEnter() {
        if (menuHoverTimeout) {
            clearTimeout(menuHoverTimeout);
            menuHoverTimeout = null;
        }
    }

    menuToggle?.addEventListener('mouseleave', handleMenuMouseLeave);
    sidebar?.addEventListener('mouseleave', handleMenuMouseLeave);

    menuToggle?.addEventListener('mouseenter', handleMenuMouseEnter);
    sidebar?.addEventListener('mouseenter', handleMenuMouseEnter);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
            closeSidebar();
            menuToggle.focus();
        }
    });

    sidebar.addEventListener('keydown', (e) => {
        if (!document.body.classList.contains('menu-open')) return;

        if (e.key === 'Tab') {
            const focusableElements = sidebar.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// Listen for hash changes (back/forward browser buttons)
window.addEventListener('hashchange', () => {
    loadInitialPage();
});

// Global window assignments for onclick handlers
window.showPage = showPage;
