// API Base URL
const API_BASE = '/api';

// Helper function to handle API responses and check for auth errors
async function handleApiResponse(response) {
    if (response.status === 401) {
        // Token expired or invalid
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateFooterUserInfo();
        // Redirect to login if trying to access admin pages
        if (window.location.hash.includes('admin')) {
            showPage('admin-login');
        }
        return false;
    }
    return true;
}

// State
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentPage = 'home';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Verify session on load (this updates authToken and currentUser)
    await verifySession();
    // Update footer after session verification
    updateFooterUserInfo();
    initializeNavigation();
    initializeCookieConsent();
    initializeModals();
    initializeAdmin();
    loadInitialPage();
});

function formatCarStatus(status) {
    if (status === 'sold') return 'SOLD OUT';
    if (status === 'coming_soon') return 'COMING SOON';
    return (status || '').toUpperCase();
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') {
        return 'Price not set';
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return value;
    }
    return `$${number.toLocaleString()}`;
}

const REQUEST_STATUS_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Client contacted' },
    { value: 'ongoing', label: 'Ongoing process' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'closed', label: 'Closed' }
];

function formatRequestStatusLabel(status) {
    const option = REQUEST_STATUS_OPTIONS.find(opt => opt.value === status);
    if (option) {
        return option.label;
    }
    if (status === 'pending') return 'New';
    if (status === 'completed') return 'Closed';
    return status || '';
}

const REQUESTS_PER_PAGE = 6;

const DEFAULT_BACKGROUND_OVERLAY = 'linear-gradient(180deg, rgba(1, 16, 24, 0.60), rgba(1, 48, 66, 0.35))';

const COOKIE_CONSENT_KEY = 'cookieConsent';
let googleAnalyticsId = '';
let currentAnalyticsId = '';

const requestPaginationState = {
    rent: { page: 1, totalPages: 1, total: 0 },
    sale: { page: 1, totalPages: 1, total: 0 }
};

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Toggle sidebar function
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
        // Focus trap: focus first focusable element in menu
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
                if (page === 'admin-dashboard' && !authToken) {
                    showPage('admin-login');
                } else {
                    showPage(page);
                }
                updateActiveNav(link);
            }
            if (document.body.classList.contains('menu-open') && window.matchMedia('(max-width: 1024px)').matches) {
                closeSidebar();
            }
            // On larger screens the menu remains open until manually closed
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

            if (page === 'admin-dashboard' && !authToken) {
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
                // Update active nav to contact
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

    // Track if a touch event just occurred to prevent hover simulation on mobile
    let lastTouchTime = 0;
    
    // Hamburger/X menu toggle - click works on both desktop and mobile
    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    // Detect touch events to prevent hover simulation
    menuToggle?.addEventListener('touchstart', () => {
        lastTouchTime = Date.now();
    }, { passive: true });

    // Open menu on hover (mouseenter) - but only on desktop
    let menuHoverTimeout = null;
    
    menuToggle?.addEventListener('mouseenter', () => {
        // Ignore mouseenter if it's from a touch event (within 500ms of touch)
        if (Date.now() - lastTouchTime < 500) {
            return;
        }
        
        // Clear any pending close timeout
        if (menuHoverTimeout) {
            clearTimeout(menuHoverTimeout);
            menuHoverTimeout = null;
        }
        // Open menu if not already open
        if (!document.body.classList.contains('menu-open')) {
            openSidebar();
        }
    });

    // Close menu when mouse leaves menu area (both sidebar and toggle button)
    function handleMenuMouseLeave() {
        // Don't auto-close on touch devices
        if (Date.now() - lastTouchTime < 500) {
            return;
        }
        
        menuHoverTimeout = setTimeout(() => {
            if (document.body.classList.contains('menu-open')) {
                closeSidebar();
            }
            menuHoverTimeout = null;
        }, 150); // Small delay to allow mouse to move between toggle and sidebar
    }

    function handleMenuMouseEnter() {
        // Clear any pending close timeout when mouse enters menu area
        if (menuHoverTimeout) {
            clearTimeout(menuHoverTimeout);
            menuHoverTimeout = null;
        }
    }

    // Add mouseleave to both toggle button and sidebar
    menuToggle?.addEventListener('mouseleave', handleMenuMouseLeave);
    sidebar?.addEventListener('mouseleave', handleMenuMouseLeave);
    
    // Add mouseenter to both to cancel close when moving between them
    menuToggle?.addEventListener('mouseenter', handleMenuMouseEnter);
    sidebar?.addEventListener('mouseenter', handleMenuMouseEnter);

    // Close sidebar on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
            closeSidebar();
            menuToggle.focus(); // Return focus to toggle button
        }
    });
    
    // Focus trap: Keep focus within menu when open
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

function initializeCookieConsent() {
    const banner = document.getElementById('cookieConsentBar');
    if (!banner) return;

    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const technicalBtn = document.getElementById('cookieTechnicalBtn');
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);

    const hideBanner = () => {
        banner.classList.add('hidden');
        banner.classList.remove('visible');
    };

    const showBanner = () => {
        banner.classList.add('visible');
        banner.classList.remove('hidden');
    };

    const applyConsent = (value) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, value);
        if (value === 'accepted') {
            enableAnalyticsIfConsented();
        }
    };

    if (storedConsent === 'accepted') {
        hideBanner();
        enableAnalyticsIfConsented();
    } else if (storedConsent === 'technical') {
        hideBanner();
    } else {
        showBanner();
    }

    acceptBtn?.addEventListener('click', () => {
        applyConsent('accepted');
        hideBanner();
    });

    technicalBtn?.addEventListener('click', () => {
        applyConsent('technical');
        hideBanner();
    });
}

function enableAnalyticsIfConsented() {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted') {
        enableAnalytics();
    }
}

function enableAnalytics() {
    const trimmedId = (googleAnalyticsId || '').trim();
    if (!trimmedId) {
        return;
    }

    // If the ID changed, remove prior script and reset state
    if (currentAnalyticsId && currentAnalyticsId !== trimmedId) {
        const oldScript = document.querySelector(`script[data-analytics-id="${currentAnalyticsId}"]`);
        if (oldScript && oldScript.parentNode) {
            oldScript.parentNode.removeChild(oldScript);
        }
        window.gaInitialized = false;
        window.dataLayer = undefined;
        window.gtag = undefined;
    }

    if (window.gaInitialized && currentAnalyticsId === trimmedId) {
        return;
    }

    if (!document.querySelector(`script[data-analytics-id="${trimmedId}"]`)) {
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${trimmedId}`;
        script.async = true;
        script.setAttribute('data-analytics-id', trimmedId);
        script.setAttribute('data-cookieconsent', 'analytics');
        document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    window.gtag('js', new Date());
    window.gtag('config', trimmedId, { anonymize_ip: true });
    window.gaInitialized = true;
    currentAnalyticsId = trimmedId;
}

function updateMetaTags(settings) {
    // Update meta description
    if (settings.metaDescription) {
        const metaDesc = document.getElementById('metaDescription');
        if (metaDesc) metaDesc.setAttribute('content', settings.metaDescription);
    }
    
    // Update meta keywords
    if (settings.metaKeywords) {
        const metaKeywords = document.getElementById('metaKeywords');
        if (metaKeywords) metaKeywords.setAttribute('content', settings.metaKeywords);
    }
    
    // Update Open Graph tags
    if (settings.ogTitle) {
        const ogTitle = document.getElementById('ogTitle');
        if (ogTitle) ogTitle.setAttribute('content', settings.ogTitle);
        
        // Also update Twitter title
        const twitterTitle = document.getElementById('twitterTitle');
        if (twitterTitle) twitterTitle.setAttribute('content', settings.ogTitle);
    }
    
    if (settings.ogDescription) {
        const ogDesc = document.getElementById('ogDescription');
        if (ogDesc) ogDesc.setAttribute('content', settings.ogDescription);
        
        // Also update Twitter description
        const twitterDesc = document.getElementById('twitterDescription');
        if (twitterDesc) twitterDesc.setAttribute('content', settings.ogDescription);
    }
    
    if (settings.ogImage) {
        const ogImg = document.getElementById('ogImage');
        if (ogImg) {
            // Make sure image URL is absolute
            const imageUrl = settings.ogImage.startsWith('http') 
                ? settings.ogImage 
                : window.location.origin + settings.ogImage;
            ogImg.setAttribute('content', imageUrl);
        }
        
        // Also update Twitter image
        const twitterImg = document.getElementById('twitterImage');
        if (twitterImg) {
            const imageUrl = settings.ogImage.startsWith('http') 
                ? settings.ogImage 
                : window.location.origin + settings.ogImage;
            twitterImg.setAttribute('content', imageUrl);
        }
    }
    
    // Update Twitter card type
    if (settings.twitterCard) {
        const twitterCard = document.getElementById('twitterCard');
        if (twitterCard) twitterCard.setAttribute('content', settings.twitterCard);
    }
    
    // Update OG URL with current page URL
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl) twitterUrl.setAttribute('content', window.location.href);
}

function showPage(pageId) {
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
        currentPage = pageId;

        // Update URL hash to persist page on refresh
        if (pageId === 'home') {
            // Remove hash for home page
            if (window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        } else {
            // Set hash for other pages (only if different from current)
            if (window.location.hash.slice(1) !== pageId) {
                window.location.hash = pageId;
            }
        }

        // Load page-specific content
        if (pageId === 'inventory-sale') {
            loadCarsForSale();
        } else if (pageId === 'inventory-rent') {
            loadCarsForRent();
        } else if (pageId === 'services') {
            loadServices();
        } else if (pageId === 'admin-dashboard' && authToken) {
            loadAdminDashboard();
        } else if (pageId === 'privacy') {
            loadPrivacyPolicy();
        }
    }
}

function updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

function loadInitialPage() {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
        // Check if user is authenticated for admin pages
        if (hash === 'admin-dashboard' || hash === 'admin-login') {
            if (hash === 'admin-dashboard' && !authToken) {
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

function updateActiveNavForPage(pageId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
}

// Listen for hash changes (back/forward browser buttons)
window.addEventListener('hashchange', () => {
    loadInitialPage();
});

// Modals
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    
    // Close modal when clicking close button with data-modal attribute
    closeButtons.forEach(btn => {
        if (btn.getAttribute('data-modal')) {
            btn.addEventListener('click', () => {
                closeModal(btn.getAttribute('data-modal'));
            });
        } else {
            // Generic close button (for car form modal)
            btn.addEventListener('click', () => {
                modals.forEach(modal => modal.style.display = 'none');
            });
        }
    });
    
    // Close modal when clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Initialize lightbox controls
    const lightbox = document.getElementById('imageLightbox');
    const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
    const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
    const lightboxNextBtn = document.getElementById('lightboxNextBtn');

    if (lightboxCloseBtn) {
        lightboxCloseBtn.addEventListener('click', closeLightbox);
    }

    if (lightboxPrevBtn) {
        lightboxPrevBtn.addEventListener('click', prevLightboxImage);
    }

    if (lightboxNextBtn) {
        lightboxNextBtn.addEventListener('click', nextLightboxImage);
    }

    // Close lightbox when clicking outside the image
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevLightboxImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextLightboxImage();
            }
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Reset forms
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Make functions globally accessible for onclick handlers
window.closeModal = closeModal;
window.openModal = openModal;

// Custom Confirmation Modal Functions
let confirmationResolve = null;

function showCustomConfirm(title, message, details = null, iconType = 'warning') {
    return new Promise((resolve) => {
        confirmationResolve = resolve;
        
        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('confirmationModalTitle');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const modalDetails = document.getElementById('confirmationModalDetails');
        const modalIcon = document.getElementById('confirmationModalIcon');
        const confirmBtn = document.getElementById('confirmationModalConfirm');
        const cancelBtn = document.getElementById('confirmationModalCancel');
        const closeBtn = document.getElementById('confirmationModalClose');
        
        // Set content
        modalTitle.textContent = title || 'Confirm Action';
        modalMessage.textContent = message || '';
        
        // Set icon type
        modalIcon.className = `custom-modal-icon ${iconType}`;
        
        // Set details if provided
        if (details && Array.isArray(details) && details.length > 0) {
            modalDetails.innerHTML = '<ul>' + details.map(detail => `<li>${detail}</li>`).join('') + '</ul>';
            modalDetails.style.display = 'block';
        } else {
            modalDetails.style.display = 'none';
        }
        
        // Remove previous event listeners by cloning
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        // Add new event listeners
        newConfirmBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(true);
                confirmationResolve = null;
            }
        });
        
        newCancelBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(false);
                confirmationResolve = null;
            }
        });
        
        newCloseBtn.addEventListener('click', () => {
            hideCustomConfirm();
            if (confirmationResolve) {
                confirmationResolve(false);
                confirmationResolve = null;
            }
        });
        
        // Close on backdrop click
        modal.addEventListener('click', function backdropClick(e) {
            if (e.target === modal) {
                hideCustomConfirm();
                modal.removeEventListener('click', backdropClick);
                if (confirmationResolve) {
                    confirmationResolve(false);
                    confirmationResolve = null;
                }
            }
        });
        
        // Show modal
        modal.classList.add('active');
    });
}

function hideCustomConfirm() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Note: We don't override window.confirm/alert globally because they're synchronous
// but our custom modal is async. Use showCustomConfirm directly in async functions.

// Load Cars for Sale
async function loadCarsForSale() {
    try {
        const response = await fetch(`${API_BASE}/cars/sale`);
        const cars = await response.json();
        displayCars(cars, 'carsForSale', 'sale');
    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

// Load Cars for Rent
async function loadCarsForRent() {
    try {
        const response = await fetch(`${API_BASE}/cars/rent`);
        const cars = await response.json();
        displayCars(cars, 'carsForRent', 'rent');
    } catch (error) {
        console.error('Error loading rental cars:', error);
    }
}

// Load Services
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`);
        const services = await response.json();
        displayServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Display Services
function displayServices(services) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;

    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="services-empty">
                <h3>No services available</h3>
                <p>We currently do not have any services listed. Please check back soon!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = services.map(service => {
        const mainImage = service.mainImage || (service.images && service.images.length > 0 ? service.images[0] : '/images/no-image.svg');
        
        return `
        <div class="service-card" style="cursor: pointer;" onclick="showServiceDetail('${service._id}');">
            ${mainImage ? `<img src="${mainImage}" alt="${service.title}" class="service-image" onerror="this.src='/images/no-image.svg'">` : ''}
            <div class="service-card-content">
                <div class="service-icon">
                    <i class="${service.icon || 'fas fa-cog'}"></i>
                </div>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-description">${service.shortDescription}</p>
            </div>
        </div>
        `;
    }).join('');
}

// Display Cars
function displayCars(cars, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (cars.length === 0) {
        container.innerHTML = `
            <div class="inventory-empty">
                <h3 class="inventory-empty-title">No cars available right now</h3>
                <p class="inventory-empty-text">We currently do not have cars in this section. Contact us and we will evaluate a solution tailored for you.</p>
                <a href="#" class="inventory-empty-button" data-page="contact">Contact Us</a>
            </div>
        `;

        const contactCta = container.querySelector('.inventory-empty-button');
        if (contactCta) {
            contactCta.addEventListener('click', (event) => {
                event.preventDefault();
                showPage('contact');
                updateActiveNavForPage('contact');
            });
        }
        return;
    }

    container.innerHTML = cars.map(car => {
        // Get the first image from images array or use legacy image field
        const carImage = (car.images && car.images.length > 0) 
            ? car.images[0] 
            : (car.image || '/images/no-image.svg');
        
        // Get car name - use brand/model for new cars, make/model for legacy
        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        
        return `
        <div class="car-card" onclick="showCarDetails('${car._id}', '${type}')">
            <img src="${carImage}" 
                 alt="${carBrand} ${carModel}" 
                 class="car-image"
                 onerror="this.src='/images/no-image.svg'">
            <div class="car-info">
                <h3 class="car-title">${carYear ? carYear + ' ' : ''}${carBrand} ${carModel}</h3>
                <div class="car-details">
                    ${car.mileage ? `<p>Mileage: ${car.mileage.toLocaleString()} miles</p>` : ''}
                    ${car.description ? `<p>${car.description.substring(0, 100)}${car.description.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                <div class="car-price">
                    ${type === 'rent' ? `$${car.dailyRate}/day` : `$${car.price ? car.price.toLocaleString() : 'N/A'}`}
                </div>
                <span class="car-status status-${car.status}">${formatCarStatus(car.status)}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Lightbox functionality
let currentLightboxIndex = 0;
let lightboxImages = [];

function openImageLightbox(images, startIndex = 0) {
    lightboxImages = images || [];
    currentLightboxIndex = startIndex;
    const lightbox = document.getElementById('imageLightbox');
    
    if (lightbox && lightboxImages.length > 0) {
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateLightboxImage() {
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    
    if (lightboxImage && lightboxImages.length > 0) {
        lightboxImage.src = lightboxImages[currentLightboxIndex];
        lightboxImage.alt = `Car image ${currentLightboxIndex + 1} of ${lightboxImages.length}`;
        
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentLightboxIndex + 1} of ${lightboxImages.length}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = currentLightboxIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentLightboxIndex === lightboxImages.length - 1;
        }
    }
}

function nextLightboxImage() {
    if (currentLightboxIndex < lightboxImages.length - 1) {
        currentLightboxIndex++;
        updateLightboxImage();
    }
}

function prevLightboxImage() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxImage();
    }
}

// Show Car Details
async function showCarDetails(carId, type) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`);
        if (!response.ok) {
            throw new Error('Car not found');
        }

        const car = await response.json();
        const modal = document.getElementById('carModal');
        const detailsContainer = document.getElementById('carDetailContent');

        if (!modal || !detailsContainer) {
            return;
        }

        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        const carTitle = `${carYear ? `${carYear} ` : ''}${carBrand} ${carModel}`.trim() || 'Vehicle Details';

        const rawImages = Array.isArray(car.images) ? car.images.filter(Boolean) : [];
        if (car.image && rawImages.length === 0) {
            rawImages.push(car.image);
        }
        const images = rawImages.length > 0 ? rawImages : ['/images/no-image.svg'];

        const specs = [];
        if (car.mileage) specs.push({ label: 'Mileage', value: `${Number(car.mileage).toLocaleString()} miles` });
        if (car.gearbox) specs.push({ label: 'Gearbox', value: car.gearbox });
        if (car.fuelType) specs.push({ label: 'Fuel Type', value: car.fuelType });
        if (car.power) specs.push({ label: 'Power', value: `${car.power} HP` });
        if (car.numPersons && type === 'rent') specs.push({ label: 'Seats', value: `${car.numPersons} persons` });
        if (car.year) specs.push({ label: 'Year', value: car.year });

        const specGridHtml = specs.length
            ? `<div class="car-spec-grid">
                ${specs.map(spec => `
                    <div class="car-spec-item">
                        <span class="car-spec-label">${escapeHtml(spec.label)}</span>
                        <span class="car-spec-value">${escapeHtml(String(spec.value))}</span>
                    </div>
                `).join('')}
            </div>`
            : '';

        const thumbnailsHtml = images.length > 1
            ? `<div class="car-detail-thumbnails">
                    ${images.map((imgUrl, index) => `
                        <button type="button" class="car-detail-thumb ${index === 0 ? 'active' : ''}" data-image="${escapeHtml(imgUrl)}" data-index="${index}" aria-label="View image ${index + 1}">
                            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(`${carTitle} thumbnail ${index + 1}`)}" onerror="this.src='/images/no-image.svg'">
                        </button>
                    `).join('')}
               </div>`
            : '';

        const formattedPrice = type === 'rent'
            ? `${formatCurrency(car.dailyRate)}/day`
            : formatCurrency(car.price);

        const requestIntro = type === 'rent'
            ? 'Let us know your preferred dates and we will confirm availability.'
            : 'Share your contact details and we will get back to you with more information.';

        const rentDateFields = type === 'rent'
            ? `
                <div class="request-form-row">
                    <input type="date" name="startDate" required>
                    <input type="date" name="endDate" required>
                </div>
                <div class="request-form-row">
                    <label for="fuelLevel" style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.9); font-size: 0.9rem;">Fuel Level at Rental Start</label>
                    <select name="fuelLevel" id="fuelLevel" required style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; color: var(--text-white);">
                        <option value="">Select fuel level</option>
                        <option value="Empty">Empty</option>
                        <option value="1/4">1/4 Full</option>
                        <option value="1/2">1/2 Full</option>
                        <option value="3/4">3/4 Full</option>
                        <option value="Full">Full</option>
                    </select>
                </div>
            `
            : '';

        const messagePlaceholder = type === 'rent'
            ? 'Tell us about your rental needs (optional)'
            : 'Let us know how we can help (optional)';

        const descriptionHtml = car.description
            ? `<div class="car-detail-description">${escapeHtml(car.description).replace(/\n/g, '<br>')}</div>`
            : '';

        detailsContainer.innerHTML = `
            <div class="car-detail-layout">
                <div class="car-detail-gallery">
                    <div class="car-detail-main-image">
                        <img src="${escapeHtml(images[0])}" alt="${escapeHtml(carTitle)}" id="carDetailMainImage" onerror="this.src='/images/no-image.svg'">
                    </div>
                    ${thumbnailsHtml}
                </div>
                <div class="car-detail-info">
                    <div class="car-detail-header">
                        <div class="car-detail-meta">
                            <span class="car-detail-badge">${type === 'rent' ? 'Rental car' : 'Vehicle for sale'}</span>
                            <span class="car-detail-badge status-${car.status || 'unknown'}">${formatCarStatus(car.status)}</span>
                        </div>
                        <h2 class="car-detail-title">${escapeHtml(carTitle)}</h2>
                        <div class="car-detail-price">
                            ${escapeHtml(formattedPrice)}
                            <span>${type === 'rent' ? 'per day' : 'asking price'}</span>
                        </div>
                    </div>
                    ${specGridHtml}
                    ${descriptionHtml}
                    <div class="car-request-actions">
                        <button class="btn-primary" id="openRequestFormBtn">Request Information</button>
                        <div class="car-request-success" id="carRequestSuccess"></div>
                        <div class="car-request-error" id="carRequestError"></div>
                        <div class="car-request-panel" id="carRequestPanel">
                            <h3>Send us your request</h3>
                            <p>${escapeHtml(requestIntro)}</p>
                            <form id="carRequestForm" class="car-request-form" novalidate>
                                <input type="hidden" name="carId" value="${escapeHtml(carId)}">
                                <input type="hidden" name="requestType" value="${escapeHtml(type)}">
                                <div class="request-form-row">
                                    <input type="text" name="clientName" placeholder="Your Name" required>
                                    <input type="email" name="clientEmail" placeholder="Your Email" required>
                                </div>
                                <div class="request-form-row">
                                    <input type="tel" name="clientPhone" placeholder="Your Phone" required>
                                </div>
                                ${rentDateFields}
                                <textarea name="message" rows="4" placeholder="${escapeHtml(messagePlaceholder)}"></textarea>
                                <button type="submit" class="btn-primary">Send Request</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const mainImage = detailsContainer.querySelector('#carDetailMainImage');
        const thumbnails = detailsContainer.querySelectorAll('.car-detail-thumb');
        
        // Track the current displayed image index
        let currentImageIndex = 0;
        
        // Update main image and sync thumbnails
        const updateMainImage = (newImage) => {
            if (mainImage && newImage) {
                mainImage.src = newImage;
                currentImageIndex = images.indexOf(newImage);
            }
            thumbnails.forEach(btn => {
                if (btn.getAttribute('data-image') === newImage) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        };
        
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const newImage = thumb.getAttribute('data-image');
                updateMainImage(newImage);
            });
        });

        // Add lightbox functionality to main image
        if (mainImage) {
            mainImage.addEventListener('click', () => {
                openImageLightbox(images, currentImageIndex);
            });
        }

        const requestButton = detailsContainer.querySelector('#openRequestFormBtn');
        const requestPanel = detailsContainer.querySelector('#carRequestPanel');
        const requestForm = detailsContainer.querySelector('#carRequestForm');
        const successAlert = detailsContainer.querySelector('#carRequestSuccess');
        const errorAlert = detailsContainer.querySelector('#carRequestError');

        if (requestButton && requestPanel) {
            requestButton.addEventListener('click', () => {
                requestPanel.classList.toggle('active');
                if (requestPanel.classList.contains('active')) {
                    requestPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        if (requestForm) {
            requestForm.addEventListener('submit', (event) => {
                event.preventDefault();
                submitCarRequest(requestForm, successAlert, errorAlert);
            });
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading car details:', error);
        alert('Error loading car details');
    }
}

async function showServiceDetail(serviceId) {
    try {
        console.log('showServiceDetail called with:', serviceId);
        const response = await fetch(`${API_BASE}/services/${serviceId}`);
        console.log('API response:', response);
        if (!response.ok) {
            throw new Error('Service not found');
        }

        const service = await response.json();
        console.log('Service data:', service);
        
        // Get the service detail elements
        const titleElement = document.getElementById('serviceDetailTitle');
        const imagesElement = document.getElementById('serviceDetailImages');
        const shortElement = document.getElementById('serviceDetailShort');
        const fullElement = document.getElementById('serviceDetailFull');
        const relatedElement = document.getElementById('relatedServicesGrid');
        const relatedSection = document.getElementById('relatedServicesSection');

        if (!titleElement) {
            console.error('Service detail elements not found');
            return;
        }

        // Set title and description
        titleElement.textContent = service.title;
        if (shortElement) {
            shortElement.textContent = service.shortDescription;
        }
        if (fullElement) {
            fullElement.innerHTML = service.fullDescription;
        }

        // Collect all images in order
        const allImages = [];
        if (service.mainImage && !allImages.includes(service.mainImage)) {
            allImages.push(service.mainImage);
        }
        if (service.images && Array.isArray(service.images)) {
            service.images.forEach(img => {
                if (img && !allImages.includes(img)) {
                    allImages.push(img);
                }
            });
        }

        // Build images HTML with thumbnails for multiple images
        let imagesHtml = '';
        if (allImages.length > 0) {
            // Main image
            imagesHtml += `<img src="${allImages[0]}" alt="${service.title}" class="service-detail-image service-detail-main-image" style="cursor: pointer;" onerror="this.src='/images/no-image.svg'">`;
            
            // Thumbnails if multiple images
            if (allImages.length > 1) {
                imagesHtml += `<div class="service-detail-thumbnails">`;
                allImages.forEach((img, index) => {
                    imagesHtml += `<img src="${img}" alt="${service.title} ${index + 1}" class="service-detail-thumbnail" data-index="${index}" onerror="this.src='/images/no-image.svg'">`;
                });
                imagesHtml += `</div>`;
            }
        } else {
            imagesHtml = `<img src="/images/no-image.svg" alt="${service.title}" class="service-detail-image">`;
        }

        // Update DOM with images
        if (imagesElement) {
            imagesElement.innerHTML = imagesHtml;
            
            // Add event listeners for image clicks
            const mainImage = imagesElement.querySelector('.service-detail-main-image');
            const thumbnails = imagesElement.querySelectorAll('.service-detail-thumbnail');
            
            if (mainImage) {
                mainImage.addEventListener('click', () => {
                    openImageLightbox(allImages, 0);
                });
            }
            
            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'), 10);
                    openImageLightbox(allImages, index);
                });
            });
        }

        // Load related services
        if (relatedElement) {
            try {
                const allServicesResponse = await fetch(`${API_BASE}/services`);
                if (allServicesResponse.ok) {
                    const allServices = await allServicesResponse.json();
                    // Get other services (excluding current one)
                    const relatedServices = allServices.filter(s => s._id !== serviceId).slice(0, 3);
                    
                    if (relatedServices.length > 0 && relatedSection) {
                        relatedSection.style.display = 'block';
                        relatedElement.innerHTML = relatedServices.map(relService => {
                            const relMainImage = relService.mainImage || (relService.images && relService.images.length > 0 ? relService.images[0] : '/images/no-image.svg');
                            return `
                            <div class="service-card" onclick="showServiceDetail('${relService._id}');" style="cursor: pointer;">
                                ${relMainImage ? `<img src="${relMainImage}" alt="${relService.title}" class="service-image" onerror="this.src='/images/no-image.svg'">` : ''}
                                <div class="service-card-content">
                                    <div class="service-icon">
                                        <i class="${relService.icon || 'fas fa-cog'}"></i>
                                    </div>
                                    <h3 class="service-title">${relService.title}</h3>
                                    <p class="service-description">${relService.shortDescription}</p>
                                </div>
                            </div>
                            `;
                        }).join('');
                    } else if (relatedSection) {
                        relatedSection.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error loading related services:', error);
            }
        }

        // Show the service detail page
        console.log('About to call showPage with service-detail');
        showPage('service-detail');
        console.log('showPage called, current page:', currentPage);
        updateActiveNavForPage('services');
    } catch (error) {
        console.error('Error loading service details:', error);
        alert('Error loading service details');
    }
}

async function submitCarRequest(formElement, successAlert, errorAlert) {
    if (!formElement) return;

    if (successAlert) {
        successAlert.textContent = '';
        successAlert.classList.remove('visible');
    }
    if (errorAlert) {
        errorAlert.textContent = '';
        errorAlert.classList.remove('visible');
    }

    const formData = new FormData(formElement);
    const payload = {
        carId: (formData.get('carId') || '').trim(),
        requestType: (formData.get('requestType') || '').trim(),
        clientName: (formData.get('clientName') || '').trim(),
        clientEmail: (formData.get('clientEmail') || '').trim(),
        clientPhone: (formData.get('clientPhone') || '').trim(),
        message: (formData.get('message') || '').trim()
    };

    if (!payload.carId || !payload.requestType) {
        if (errorAlert) {
            errorAlert.textContent = 'Missing request details. Please reload and try again.';
            errorAlert.classList.add('visible');
        }
        return;
    }

    if (!payload.clientName || !payload.clientEmail || !payload.clientPhone) {
        if (errorAlert) {
            errorAlert.textContent = 'Please provide your name, email, and phone number.';
            errorAlert.classList.add('visible');
        }
        return;
    }

    if (payload.requestType === 'rent') {
        const startDate = (formData.get('startDate') || '').trim();
        const endDate = (formData.get('endDate') || '').trim();

        if (!startDate || !endDate) {
            if (errorAlert) {
                errorAlert.textContent = 'Please select both a start and end date.';
                errorAlert.classList.add('visible');
            }
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            if (errorAlert) {
                errorAlert.textContent = 'Start date must be before the end date.';
                errorAlert.classList.add('visible');
            }
            return;
        }

        payload.startDate = startDate;
        payload.endDate = endDate;
    }

    try {
        const response = await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (successAlert) {
                successAlert.textContent = 'Thank you! Your request has been sent.';
                successAlert.classList.add('visible');
            }

            const requestTypeField = formElement.querySelector('input[name="requestType"]');
            const carIdField = formElement.querySelector('input[name="carId"]');
            const savedType = requestTypeField ? requestTypeField.value : payload.requestType;
            const savedCarId = carIdField ? carIdField.value : payload.carId;

            formElement.reset();

            if (requestTypeField) requestTypeField.value = savedType;
            if (carIdField) carIdField.value = savedCarId;

            const requestPanel = formElement.closest('.car-request-panel');
            if (requestPanel) {
                requestPanel.classList.remove('active');
            }
        } else {
            let errorData = {};
            let rawBody = '';
            try {
                rawBody = await response.text();
                errorData = rawBody ? JSON.parse(rawBody) : {};
            } catch {
                errorData = {};
            }
            console.error('Request submission failed:', {
                status: response.status,
                statusText: response.statusText,
                body: rawBody || '(no body)'
            });
            if (errorAlert) {
                const errorMessage = errorData.message || errorData.error || `Unable to submit your request. Server responded with status ${response.status}.`;
                errorAlert.textContent = errorMessage;
                errorAlert.classList.add('visible');
            }
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        if (errorAlert) {
            errorAlert.textContent = 'Unable to submit your request. Please try again later.';
            errorAlert.classList.add('visible');
        }
    }
}

// Admin Login
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateFooterUserInfo();
            showPage('admin-dashboard');
            loadAdminDashboard();
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Error connecting to server';
        errorDiv.style.display = 'block';
    }
});

// Contact Form Submission
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmailInput').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const submitButton = form.querySelector('button[type="submit"]');

    // Reset any previous error states
    const existingError = form.querySelector('.contact-form-error');
    if (existingError) {
        existingError.remove();
    }
    const existingSuccess = form.querySelector('.contact-form-success');
    if (existingSuccess) {
        existingSuccess.remove();
    }

    // Basic validation
    if (!name || !email || !subject || !message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'contact-form-error';
        errorDiv.textContent = 'Please fill in all fields.';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.marginTop = '10px';
        form.appendChild(errorDiv);
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'contact-form-error';
        errorDiv.textContent = 'Please enter a valid email address.';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.marginTop = '10px';
        form.appendChild(errorDiv);
        return;
    }

    // Disable submit button
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'contact-form-success';
            successDiv.textContent = 'Thank you! Your message has been sent successfully.';
            successDiv.style.color = '#51cf66';
            successDiv.style.marginTop = '10px';
            form.appendChild(successDiv);
            
            // Reset form
            form.reset();
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successDiv.remove();
            }, 5000);
        } else {
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'contact-form-error';
            errorDiv.textContent = data.message || 'Failed to send message. Please try again.';
            errorDiv.style.color = '#ff6b6b';
            errorDiv.style.marginTop = '10px';
            form.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('Error submitting contact form:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'contact-form-error';
        errorDiv.textContent = 'Unable to send message. Please try again later.';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.marginTop = '10px';
        form.appendChild(errorDiv);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

// Admin Dashboard
function initializeAdmin() {
    // Admin navigation - handle both regular buttons and icon buttons
    document.querySelectorAll('.admin-nav-btn, .admin-nav-btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Find the button element (in case click is on icon/text child)
            const button = e.target.closest('.admin-nav-btn, .admin-nav-btn-icon');
            if (!button) return;

            if (button.id === 'logoutBtn') {
                logout();
                return;
            }

            const section = button.getAttribute('data-section');
            if (section) {
                document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-nav-btn-icon').forEach(b => b.classList.remove('active'));
                
                const targetSection = document.getElementById(section);
                if (targetSection) {
                    // Show the target section first
                    targetSection.classList.add('active');
                    button.classList.add('active');
                    
                    // Force browser to process the display change
                    void targetSection.offsetHeight;

                    // Load section content based on which section is active
                    if (section === 'manage-sale') {
                        loadAdminCars('sale');
                    } else if (section === 'manage-rent') {
                        loadAdminCars('rent');
                    } else if (section === 'manage-services') {
                        loadAdminServices();
                    } else if (section === 'rental-requests') {
                        initializeRentalCalendarView();
                        loadClientRequests('rent');
                    } else if (section === 'client-requests') {
                        loadClientRequests('sale');
                    } else if (section === 'dashboard') {
                        // Always reload stats when dashboard section is shown
                        // Use double setTimeout to ensure DOM has fully updated
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                loadDashboardStats();
                            });
                        }, 0);
                    } else if (section === 'site-settings') {
                        loadSiteSettings();
                    }
                }
            }
        });
    });

    // Add car buttons
    document.getElementById('addSaleCarBtn')?.addEventListener('click', () => {
        openCarForm('sale');
    });

    document.getElementById('addRentCarBtn')?.addEventListener('click', () => {
        openCarForm('rent');
    });

    // Car form submit
    document.getElementById('carForm')?.addEventListener('submit', handleCarFormSubmit);

    // Add service button
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        openServiceForm();
    });

    // Service form submit
    document.getElementById('serviceForm')?.addEventListener('submit', handleServiceFormSubmit);

    // Service image upload
    document.getElementById('serviceImages')?.addEventListener('change', handleServiceImageUpload);

    // Site Settings
    initializeSiteSettings();
}

// Site Settings Functions
function initializeSiteSettings() {
    // Load settings on page load
    loadSiteSettingsForDisplay();

    // Logo upload
    document.getElementById('uploadLogoBtn')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('logoUpload');
        if (!fileInput.files || fileInput.files.length === 0) {
            showSiteSettingsError('Please select a logo file');
            return;
        }

        const formData = new FormData();
        formData.append('logo', fileInput.files[0]);

        try {
            const response = await fetch(`${API_BASE}/upload/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                document.getElementById('logoUrl').value = data.url;
                document.getElementById('logoPreviewImg').src = data.url;
                showSiteSettingsSuccess('Logo uploaded successfully');
            } else {
                showSiteSettingsError(data.message || 'Error uploading logo');
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            showSiteSettingsError('Error uploading logo');
        }
    });

    // Background upload
    document.getElementById('uploadBackgroundBtn')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('backgroundUpload');
        if (!fileInput.files || fileInput.files.length === 0) {
            showSiteSettingsError('Please select a background image');
            return;
        }

        const formData = new FormData();
        formData.append('background', fileInput.files[0]);

        try {
            const response = await fetch(`${API_BASE}/upload/background`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                document.getElementById('backgroundImageUrl').value = data.url;
                const bgImg = document.getElementById('bgPreviewImg');
                bgImg.src = data.url;
                bgImg.style.display = 'block';
                document.documentElement.style.setProperty('--site-background-image', `url('${data.url}')`);
                document.documentElement.style.setProperty('--site-background-overlay', DEFAULT_BACKGROUND_OVERLAY);
                showSiteSettingsSuccess('Background image uploaded successfully');
            } else {
                showSiteSettingsError(data.message || 'Error uploading background');
            }
        } catch (error) {
            console.error('Background upload error:', error);
            showSiteSettingsError('Error uploading background');
        }
    });

    // Color picker synchronization with appropriate default opacities
    setupColorPickerSync('menuBackgroundColor', 'menuBackgroundColorText', 0.65);
    setupColorPickerSync('containerBackgroundColor', 'containerBackgroundColorText', 0.6);
    setupColorPickerSync('containerBorderColor', 'containerBorderColorText', 0.2);

    // Form submission
    document.getElementById('siteSettingsForm')?.addEventListener('submit', handleSiteSettingsSubmit);

    // Reset button
    document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSiteSettings);

    // Add social link button
    document.getElementById('addSocialLinkBtn')?.addEventListener('click', addNewSocialLink);

    // Change password button
    document.getElementById('changePasswordBtn')?.addEventListener('click', handleChangePassword);

    // Settings tabs
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchSettingsTab(tabName);
        });
    });
}

function switchSettingsTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    const activeTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
    const activeContent = document.querySelector(`.settings-tab-content[data-tab-content="${tabName}"]`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // Update API feed URLs when switching to api-feeds tab
    if (tabName === 'api-feeds') {
        updateApiFeedUrls();
    }
}

function updateApiFeedUrls() {
    const baseUrl = window.location.origin;
    
    const googleFeedUrl = document.getElementById('googleFeedUrl');
    if (googleFeedUrl) {
        googleFeedUrl.textContent = `${baseUrl}/feeds/google-vehicles.json`;
    }
    
    const metaFeedUrl = document.getElementById('metaFeedUrl');
    if (metaFeedUrl) {
        metaFeedUrl.textContent = `${baseUrl}/feeds/meta-vehicles.csv`;
    }
    
    const googleFeedLink = document.getElementById('googleFeedLink');
    if (googleFeedLink) {
        googleFeedLink.href = `${baseUrl}/feeds/google-vehicles.json`;
    }
    
    const metaFeedLink = document.getElementById('metaFeedLink');
    if (metaFeedLink) {
        metaFeedLink.href = `${baseUrl}/feeds/meta-vehicles.csv`;
    }
}

// Global function for copying feed URLs to clipboard
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent;
    
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(element);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopy(text);
    }
};

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        const element = document.activeElement;
        showCopySuccess(element);
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textarea);
}

function showCopySuccess(element) {
    // Find the nearest button that triggered the copy
    const button = element.closest('.api-feed-box')?.querySelector('button[onclick*="copyToClipboard"]');
    if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = 'rgba(40, 167, 69, 0.3)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
}

function setupColorPickerSync(colorPickerId, textInputId, defaultOpacity = 0.65) {
    const colorPicker = document.getElementById(colorPickerId);
    const textInput = document.getElementById(textInputId);
    
    if (colorPicker && textInput) {
        // Sync color picker to text input
        colorPicker.addEventListener('input', () => {
            const hex = colorPicker.value;
            const rgb = hexToRgb(hex);
            if (rgb) {
                // Preserve existing opacity if text input has a value, otherwise use default
                const currentValue = textInput.value;
                const existingRgba = parseRgba(currentValue);
                const opacity = existingRgba ? existingRgba.a : defaultOpacity;
                textInput.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
            }
        });

        // Sync text input to color picker (parse rgba)
        textInput.addEventListener('input', () => {
            const rgba = parseRgba(textInput.value);
            if (rgba) {
                colorPicker.value = rgbToHex(rgba.r, rgba.g, rgba.b);
            }
        });
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

function parseRgba(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
        };
    }
    return null;
}

async function loadSiteSettings() {
    try {
        const response = await fetch(`${API_BASE}/site-settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const settings = await response.json();
            populateSiteSettingsForm(settings);
        } else {
            showSiteSettingsError('Error loading site settings');
        }
    } catch (error) {
        console.error('Error loading site settings:', error);
        showSiteSettingsError('Error loading site settings');
    }
}

async function loadSiteSettingsForDisplay() {
    try {
        const response = await fetch(`${API_BASE}/site-settings`);
        if (response.ok) {
            const settings = await response.json();
            applySiteSettings(settings);
        }
    } catch (error) {
        console.error('Error loading site settings for display:', error);
    }
}

async function loadPrivacyPolicy() {
    try {
        const response = await fetch(`${API_BASE}/site-settings`);
        if (response.ok) {
            const settings = await response.json();
            updatePrivacyPolicy(settings);
        }
    } catch (error) {
        console.error('Error loading privacy policy:', error);
        const privacyContent = document.getElementById('privacyPolicyContent');
        if (privacyContent) {
            privacyContent.innerHTML = '<p class="privacy-intro">Error loading privacy policy. Please try again later.</p>';
        }
    }
}

function populateSiteSettingsForm(settings) {
    document.getElementById('siteTitle').value = settings.siteTitle || '';
    document.getElementById('logoText').value = settings.logoText || '';
    document.getElementById('phoneNumber').value = settings.phoneNumber || '';
    document.getElementById('emailAddress').value = settings.emailAddress || '';
    document.getElementById('adminEmail').value = settings.adminEmail || '';
    document.getElementById('address').value = settings.address || '';
    document.getElementById('businessHours').value = settings.businessHours || '';
    document.getElementById('googleAnalyticsId').value = settings.googleAnalyticsId || '';
    document.getElementById('logoUrl').value = settings.logoUrl || '';
    document.getElementById('backgroundImageUrl').value = settings.backgroundImageUrl || '';
    
    // SEO fields
    document.getElementById('metaDescription').value = settings.metaDescription || '';
    document.getElementById('metaKeywords').value = settings.metaKeywords || '';
    document.getElementById('ogTitle').value = settings.ogTitle || '';
    document.getElementById('ogDescription').value = settings.ogDescription || '';
    document.getElementById('ogImage').value = settings.ogImage || '';
    document.getElementById('twitterCard').value = settings.twitterCard || 'summary_large_image';

    // Set logo preview
    if (settings.logoUrl) {
        document.getElementById('logoPreviewImg').src = settings.logoUrl;
    }

    // Set background preview
    const bgImg = document.getElementById('bgPreviewImg');
    if (bgImg) {
        if (settings.backgroundImageUrl) {
            bgImg.src = settings.backgroundImageUrl;
        }
        const hasImageUrl = document.getElementById('backgroundImageUrl')?.value?.trim();
        bgImg.style.display = hasImageUrl ? 'block' : 'none';
    }

    // Set colors - convert rgba to hex for color pickers, with new defaults
    const menuBgColor = settings.menuBackgroundColor || 'rgba(8, 36, 48, 0.70)';
    const menuBgRgba = parseRgba(menuBgColor);
    if (menuBgRgba) {
        document.getElementById('menuBackgroundColor').value = rgbToHex(menuBgRgba.r, menuBgRgba.g, menuBgRgba.b);
        document.getElementById('menuBackgroundColorText').value = menuBgColor;
    }

    document.getElementById('menuTextColor').value = settings.menuTextColor || '#f4f7f9';
    document.getElementById('menuAccentColor').value = settings.menuAccentColor || '#85c4e4';

    const containerBgColor = settings.containerBackgroundColor || 'rgba(14, 46, 60, 0.60)';
    const containerBgRgba = parseRgba(containerBgColor);
    if (containerBgRgba) {
        document.getElementById('containerBackgroundColor').value = rgbToHex(containerBgRgba.r, containerBgRgba.g, containerBgRgba.b);
        document.getElementById('containerBackgroundColorText').value = containerBgColor;
    }

    const containerBorderColor = settings.containerBorderColor || 'rgba(194, 228, 242, 0.35)';
    const containerBorderRgba = parseRgba(containerBorderColor);
    if (containerBorderRgba) {
        document.getElementById('containerBorderColor').value = rgbToHex(containerBorderRgba.r, containerBorderRgba.g, containerBorderRgba.b);
        document.getElementById('containerBorderColorText').value = containerBorderColor;
    }

    document.getElementById('containerTextColor').value = settings.containerTextColor || '#e6eef2';
    
    // Set contract terms
    document.getElementById('contractTerms').value = settings.contractTerms || '';
    document.getElementById('salesContractTerms').value = settings.salesContractTerms || '';
    
    // Set privacy policy
    document.getElementById('privacyPolicy').value = settings.privacyPolicy || '';
    
    // Populate social links editor
    if (settings.socialLinks && Array.isArray(settings.socialLinks)) {
        populateSocialLinksEditor(settings.socialLinks);
    }
}

async function handleSiteSettingsSubmit(e) {
    e.preventDefault();
    hideSiteSettingsMessages();
 
    // Prepare social links from form
    updateSocialLinksInput();
    let socialLinks = [];
    try {
        const socialLinksJson = document.getElementById('socialLinks').value;
        if (socialLinksJson) {
            socialLinks = JSON.parse(socialLinksJson);
        }
    } catch (err) {
        console.error('Error parsing social links:', err);
    }
 
    const settingsData = {
        siteTitle: document.getElementById('siteTitle').value,
        logoText: document.getElementById('logoText').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        emailAddress: document.getElementById('emailAddress').value,
        adminEmail: document.getElementById('adminEmail').value,
        address: document.getElementById('address').value,
        businessHours: document.getElementById('businessHours').value,
        googleAnalyticsId: document.getElementById('googleAnalyticsId').value.trim(),
        logoUrl: document.getElementById('logoUrl').value,
        backgroundImageUrl: document.getElementById('backgroundImageUrl').value,
        menuBackgroundColor: document.getElementById('menuBackgroundColorText').value || document.getElementById('menuBackgroundColor').value,
        menuTextColor: document.getElementById('menuTextColor').value,
        menuAccentColor: document.getElementById('menuAccentColor').value,
        containerBackgroundColor: document.getElementById('containerBackgroundColorText').value || document.getElementById('containerBackgroundColor').value,
        containerBorderColor: document.getElementById('containerBorderColorText').value || document.getElementById('containerBorderColor').value,
        containerTextColor: document.getElementById('containerTextColor').value,
        contractTerms: document.getElementById('contractTerms').value,
        salesContractTerms: document.getElementById('salesContractTerms').value,
        privacyPolicy: document.getElementById('privacyPolicy').value,
        socialLinks: socialLinks,
        // SEO fields
        metaDescription: document.getElementById('metaDescription').value,
        metaKeywords: document.getElementById('metaKeywords').value,
        ogTitle: document.getElementById('ogTitle').value,
        ogDescription: document.getElementById('ogDescription').value,
        ogImage: document.getElementById('ogImage').value,
        twitterCard: document.getElementById('twitterCard').value
    };

    try {
        const response = await fetch(`${API_BASE}/site-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(settingsData)
        });

        if (response.ok) {
            const updatedSettings = await response.json();
            applySiteSettings(updatedSettings);
            showSiteSettingsSuccess('Settings saved successfully!');
            // Reload settings to reflect any server-side changes
            setTimeout(() => loadSiteSettingsForDisplay(), 500);
        } else {
            const data = await response.json();
            showSiteSettingsError(data.message || 'Error saving settings');
        }
    } catch (error) {
        console.error('Error saving site settings:', error);
        showSiteSettingsError('Error saving settings');
    }
}

function applySiteSettings(settings) {
    // Apply site title
    if (settings.siteTitle) {
        document.title = settings.siteTitle;
    }
    
    // Update SEO meta tags
    updateMetaTags(settings);

    // Apply logo
    if (settings.logoUrl) {
        const logoImgs = document.querySelectorAll('.site-logo');
        logoImgs.forEach(img => {
            if (img.src !== settings.logoUrl) {
                img.src = settings.logoUrl;
            }
            if (settings.logoText) {
                img.alt = `${settings.logoText} Logo`;
            }
        });
    }

    // Apply logo text
    if (settings.logoText) {
        document.querySelectorAll('.logo-text').forEach(el => {
            el.textContent = settings.logoText;
        });
        document.querySelectorAll('.home-identity-title').forEach(el => {
            el.textContent = settings.logoText;
        });
    }

    // Apply phone number to contact chips
    if (settings.phoneNumber) {
        document.querySelectorAll('[data-contact-phone-value]').forEach(el => {
            el.textContent = settings.phoneNumber;
        });

        const telHref = buildTelHref(settings.phoneNumber);
        document.querySelectorAll('[data-contact-phone-link]').forEach(link => {
            if (telHref) {
                link.href = telHref;
            }
            link.setAttribute('aria-label', `Call us at ${settings.phoneNumber}`);
        });
    }

    // Apply email address (header/other locations if needed)
    // Contact page is updated via updateContactPageWithSettings()

    // Apply address to contact chips
    if (settings.address) {
        document.querySelectorAll('[data-contact-address-value]').forEach(el => {
            el.textContent = settings.address;
        });

        const directionsUrl = buildDirectionsUrl(settings.address);
        document.querySelectorAll('[data-contact-address-link]').forEach(link => {
            if (directionsUrl) {
                link.href = directionsUrl;
            }
            link.setAttribute('aria-label', `Get directions to ${settings.address}`);
        });
    }

    // Update contact page with all settings
    updateContactPageWithSettings(settings);

    // Update analytics configuration
    const incomingAnalyticsId = (settings.googleAnalyticsId || '').trim();
    if (incomingAnalyticsId !== googleAnalyticsId) {
        if (incomingAnalyticsId === '') {
            // If analytics is being cleared, reset trackers
            const oldScript = currentAnalyticsId
                ? document.querySelector(`script[data-analytics-id="${currentAnalyticsId}"]`)
                : null;
            if (oldScript && oldScript.parentNode) {
                oldScript.parentNode.removeChild(oldScript);
            }
            window.gaInitialized = false;
            window.dataLayer = undefined;
            window.gtag = undefined;
            currentAnalyticsId = '';
        }
        googleAnalyticsId = incomingAnalyticsId;
    }
    enableAnalyticsIfConsented();

    // Apply background via CSS variable (image only)
    const hasCustomBackground = settings.backgroundImageUrl && settings.backgroundImageUrl.trim() !== '';
    const backgroundImage = hasCustomBackground ? settings.backgroundImageUrl.trim() : '/site_bg.avif';
    document.documentElement.style.setProperty('--site-background-image', `url('${backgroundImage}')`);
    document.documentElement.style.setProperty('--site-background-overlay', DEFAULT_BACKGROUND_OVERLAY);

    // Apply menu colors via CSS variables
    if (settings.menuBackgroundColor) {
        document.documentElement.style.setProperty('--menu-bg-color', settings.menuBackgroundColor);
    }
    if (settings.menuTextColor) {
        document.documentElement.style.setProperty('--menu-text-color', settings.menuTextColor);
    }
    if (settings.menuAccentColor) {
        document.documentElement.style.setProperty('--menu-accent-color', settings.menuAccentColor);
    }

    // Apply container colors via CSS variables
    if (settings.containerBackgroundColor) {
        document.documentElement.style.setProperty('--container-bg-color', settings.containerBackgroundColor);
    }
    if (settings.containerBorderColor) {
        document.documentElement.style.setProperty('--container-border-color', settings.containerBorderColor);
    }
    if (settings.containerTextColor) {
        document.documentElement.style.setProperty('--container-text-color', settings.containerTextColor);
    }

    // Apply privacy policy
    updatePrivacyPolicy(settings);

    // Render social links
    if (settings.socialLinks && Array.isArray(settings.socialLinks)) {
        renderSocialLinks(settings.socialLinks);
    }

    updateFooterUserInfo();
}

function formatPrivacyPolicy(text) {
    if (!text) return '';
    
    // Escape HTML first
    const escapedText = escapeHtml(text);
    
    // Split into paragraphs (double line breaks)
    const paragraphs = escapedText.split(/\n\n+/).filter(p => p.trim());
    
    if (paragraphs.length === 0) return '';
    
    let html = '';
    let isFirst = true;
    
    paragraphs.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;
        
        // Check if paragraph looks like a heading (all caps on first line, short, ends with colon)
        const lines = trimmed.split('\n');
        const firstLine = lines[0].trim();
        const isHeading = lines.length > 1 && 
                         firstLine.length < 80 && 
                         (firstLine.endsWith(':') || firstLine.match(/^[A-Z\s]+$/));
        
        if (isHeading) {
            // It's a section heading
            const headingText = firstLine.replace(':', '').trim();
            const content = lines.slice(1).join('\n').trim();
            
            html += `<div class="privacy-section">`;
            html += `<h2>${headingText}</h2>`;
            if (content) {
                html += formatParagraphContent(content);
            }
            html += `</div>`;
            isFirst = false;
        } else {
            // Regular paragraph
            if (isFirst) {
                html += `<p class="privacy-intro">${formatParagraphContent(trimmed)}</p>`;
                isFirst = false;
            } else {
                html += formatParagraphContent(trimmed);
            }
        }
    });
    
    return html;
}

function formatParagraphContent(text) {
    const lines = text.split('\n').filter(l => l.trim());
    let html = '';
    let inList = false;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        
        // Check if it's a list item
        const listMatch = trimmed.match(/^[-•]\s+(.+)$/);
        if (listMatch) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${formatStrongText(listMatch[1])}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            if (trimmed) {
                html += `<p>${formatStrongText(trimmed)}</p>`;
            }
        }
    });
    
    if (inList) {
        html += '</ul>';
    }
    
    return html;
}

function formatStrongText(text) {
    // Format **text** as <strong>text</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function updatePrivacyPolicy(settings) {
    const privacyContent = document.getElementById('privacyPolicyContent');
    if (!privacyContent) return;
    
    if (settings.privacyPolicy) {
        privacyContent.innerHTML = formatPrivacyPolicy(settings.privacyPolicy);
    } else {
        privacyContent.innerHTML = '<p class="privacy-intro">Privacy policy content will be displayed here once configured in Site Settings.</p>';
    }
}

async function resetSiteSettings() {
    const confirmed = await showCustomConfirm(
        'Reset Settings',
        'Are you sure you want to reset all settings to defaults? This cannot be undone.',
        null,
        'warning'
    );
    if (confirmed) {
        document.getElementById('siteSettingsForm').reset();
        document.getElementById('logoUrl').value = '';
        document.getElementById('backgroundImageUrl').value = '';
        document.getElementById('logoPreviewImg').src = '';
        document.getElementById('bgPreviewImg').style.display = 'none';
        // Reset to default values
        document.getElementById('siteTitle').value = 'Sarasota Automotive';
        document.getElementById('logoText').value = 'Sarasota Automotive';
        document.getElementById('phoneNumber').value = '(941) 555-0123';
        document.getElementById('emailAddress').value = 'info@sarasotaautomotive.com';
        document.getElementById('adminEmail').value = 'info@sarasotaautomotive.com';
        document.getElementById('address').value = '5671 McIntosh Rd Sarasota, FL 34233';
        document.getElementById('googleAnalyticsId').value = '';
        
        // Reset colors to new teal glass defaults
        document.getElementById('menuBackgroundColor').value = '#082430';
        document.getElementById('menuBackgroundColorText').value = 'rgba(8, 36, 48, 0.70)';
        document.getElementById('menuTextColor').value = '#f4f7f9';
        document.getElementById('menuAccentColor').value = '#85c4e4';
        
        document.getElementById('containerBackgroundColor').value = '#0e2e3c';
        document.getElementById('containerBackgroundColorText').value = 'rgba(14, 46, 60, 0.60)';
        document.getElementById('containerBorderColor').value = '#c2e4f2';
        document.getElementById('containerBorderColorText').value = 'rgba(194, 228, 242, 0.35)';
        document.getElementById('containerTextColor').value = '#e6eef2';
    }
}

function showSiteSettingsError(message) {
    const errorDiv = document.getElementById('siteSettingsError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => hideSiteSettingsMessages(), 5000);
    }
}

function showSiteSettingsSuccess(message) {
    const successDiv = document.getElementById('siteSettingsSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => hideSiteSettingsMessages(), 5000);
    }
}

function hideSiteSettingsMessages() {
    const errorDiv = document.getElementById('siteSettingsError');
    const successDiv = document.getElementById('siteSettingsSuccess');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateFooterUserInfo();
    showPage('home');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('[data-page="home"]')?.classList.add('active');
}

// Verify session on page load
async function verifySession() {
    if (!authToken) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        return;
    }

    // If we have a token but no user info, try to decode it
    if (!currentUser && authToken) {
        try {
            // Decode JWT token to get user info (without verification, just for display)
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            if (payload.username) {
                currentUser = { username: payload.username, role: payload.role };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } catch (e) {
            // If token is malformed, clear it
            console.error('Error decoding token:', e);
        }
    }

    try {
        // Verify token by making a test API call
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            // Token is invalid or expired
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
        // If response is ok, token is valid and we keep the stored user info
    } catch (error) {
        console.error('Error verifying session:', error);
        // On error, clear session
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }
}

// Render social links in the sidebar footer
function renderSocialLinks(socialLinks) {
    const container = document.querySelector('.sidebar-footer-socials');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort by displayOrder
    const sorted = [...socialLinks].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    sorted.forEach(link => {
        if (link.url && link.url.trim()) {
            const anchor = document.createElement('a');
            anchor.className = 'sidebar-footer-social';
            anchor.href = link.url;
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.setAttribute('aria-label', `Visit our ${link.name}`);
            
            const span = document.createElement('span');
            span.textContent = link.icon || '•';
            anchor.appendChild(span);
            
            container.appendChild(anchor);
        }
    });
}

// Populate social links editor in admin form
function populateSocialLinksEditor(socialLinks) {
    const container = document.getElementById('socialLinksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort by displayOrder
    const sorted = [...socialLinks].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    sorted.forEach((link, index) => {
        const linkDiv = document.createElement('div');
        linkDiv.className = 'social-link-item';
        linkDiv.style.marginBottom = '15px';
        linkDiv.style.padding = '15px';
        linkDiv.style.backgroundColor = 'rgba(255,255,255,0.05)';
        linkDiv.style.borderRadius = '5px';
        linkDiv.innerHTML = `
            <div class="form-group" style="margin-bottom: 10px;">
                <label>Link Name</label>
                <input type="text" class="social-link-name" value="${escapeHtml(link.name || '')}" placeholder="e.g., Facebook, Twitter, Instagram">
            </div>
            <div class="form-group" style="margin-bottom: 10px;">
                <label>URL</label>
                <input type="url" class="social-link-url" value="${escapeHtml(link.url || '')}" placeholder="https://example.com">
            </div>
            <div class="form-group" style="margin-bottom: 10px;">
                <label>Icon/Symbol</label>
                <input type="text" class="social-link-icon" value="${escapeHtml(link.icon || '')}" placeholder="f, ★, ▶, or emoji" maxlength="5">
            </div>
            <div class="form-group" style="margin-bottom: 10px;">
                <label>Display Order</label>
                <input type="number" class="social-link-order" value="${link.displayOrder || index}" min="0" style="width: 100px;">
            </div>
            <button type="button" class="btn-danger remove-social-link" style="padding: 5px 10px; font-size: 12px;">Remove Link</button>
        `;
        
        const removeBtn = linkDiv.querySelector('.remove-social-link');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            linkDiv.remove();
            updateSocialLinksInput();
        });
        
        // Add event listeners to inputs to update the hidden field when values change
        const inputs = linkDiv.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', updateSocialLinksInput);
            input.addEventListener('input', updateSocialLinksInput);
        });
        
        container.appendChild(linkDiv);
    });
    
    // Update hidden input with JSON
    updateSocialLinksInput();
}

// Update the hidden socialLinks input field
function updateSocialLinksInput() {
    const items = document.querySelectorAll('.social-link-item');
    const socialLinks = Array.from(items).map(item => ({
        name: item.querySelector('.social-link-name').value,
        url: item.querySelector('.social-link-url').value,
        icon: item.querySelector('.social-link-icon').value,
        displayOrder: parseInt(item.querySelector('.social-link-order').value, 10) || 0
    }));
    
    document.getElementById('socialLinks').value = JSON.stringify(socialLinks);
}

// Add a new empty social link to the editor
function addNewSocialLink(e) {
    if (e) {
        e.preventDefault();
    }
    
    const container = document.getElementById('socialLinksContainer');
    if (!container) return;
    
    // Get the current number of links to set displayOrder
    const items = container.querySelectorAll('.social-link-item');
    const newOrder = items.length;
    
    const linkDiv = document.createElement('div');
    linkDiv.className = 'social-link-item';
    linkDiv.style.marginBottom = '15px';
    linkDiv.style.padding = '15px';
    linkDiv.style.backgroundColor = 'rgba(255,255,255,0.05)';
    linkDiv.style.borderRadius = '5px';
    linkDiv.innerHTML = `
        <div class="form-group" style="margin-bottom: 10px;">
            <label>Link Name</label>
            <input type="text" class="social-link-name" value="" placeholder="e.g., Facebook, Twitter, Instagram">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
            <label>URL</label>
            <input type="url" class="social-link-url" value="" placeholder="https://example.com">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
            <label>Icon/Symbol</label>
            <input type="text" class="social-link-icon" value="" placeholder="f, ★, ▶, or emoji" maxlength="5">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
            <label>Display Order</label>
            <input type="number" class="social-link-order" value="${newOrder}" min="0" style="width: 100px;">
        </div>
        <button type="button" class="btn-danger remove-social-link" style="padding: 5px 10px; font-size: 12px;">Remove Link</button>
    `;
    
    const removeBtn = linkDiv.querySelector('.remove-social-link');
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        linkDiv.remove();
        updateSocialLinksInput();
    });
    
    // Add event listeners to inputs to update the hidden field when values change
    const inputs = linkDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', updateSocialLinksInput);
        input.addEventListener('input', updateSocialLinksInput);
    });
    
    container.appendChild(linkDiv);
    
    // Update the hidden input with new data
    updateSocialLinksInput();
}

// Handle password change
async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    const errorEl = document.getElementById('passwordChangeError');
    const successEl = document.getElementById('passwordChangeSuccess');
    
    // Hide previous messages
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    
    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        if (errorEl) {
            errorEl.textContent = 'All password fields are required';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (newPassword.length < 6) {
        if (errorEl) {
            errorEl.textContent = 'New password must be at least 6 characters long';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        if (errorEl) {
            errorEl.textContent = 'New passwords do not match';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (!authToken) {
        if (errorEl) {
            errorEl.textContent = 'You must be logged in to change password';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (successEl) {
                successEl.textContent = 'Password changed successfully!';
                successEl.style.display = 'block';
            }
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                if (successEl) successEl.style.display = 'none';
            }, 5000);
        } else {
            if (errorEl) {
                errorEl.textContent = data.message || 'Failed to change password';
                errorEl.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error changing password:', error);
        if (errorEl) {
            errorEl.textContent = 'Error changing password. Please try again.';
            errorEl.style.display = 'block';
        }
    }
}

// Update footer to show user info when logged in
function updateFooterUserInfo() {
    const footerAdminLink = document.querySelector('.footer-admin-link');
    if (!footerAdminLink) return;

    if (authToken && currentUser) {
        footerAdminLink.innerHTML = `
            <div class="footer-admin-status">
                <span class="footer-admin-text">You are logged in as <strong>${escapeHtml(currentUser.username)}</strong></span>
            </div>
            <div class="footer-admin-actions">
                <a href="#" id="footerAdminLink" class="admin-link" data-page="admin-dashboard">Admin Dashboard</a>
                <span class="footer-admin-divider">|</span>
                <a href="#" id="footerLogoutLink" class="admin-link">Logout</a>
            </div>
        `;
    } else {
        footerAdminLink.innerHTML = `
            <a href="#" data-page="admin-login" id="footerAdminLink" class="admin-link footer-admin-access">Admin Access</a>
        `;
    }

    const footerAdminLinkBtn = document.getElementById('footerAdminLink');
    if (footerAdminLinkBtn) {
        footerAdminLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = footerAdminLinkBtn.getAttribute('data-page') || 'admin-login';
            if (page === 'admin-dashboard' && !authToken) {
                showPage('admin-login');
                updateActiveNavForPage('admin-login');
            } else {
                showPage(page);
                updateActiveNavForPage(page);
            }
        });
    }

    const footerLogoutLink = document.getElementById('footerLogoutLink');
    if (footerLogoutLink) {
        footerLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function buildTelHref(phoneNumber) {
    if (!phoneNumber) return '';

    const trimmed = phoneNumber.trim();
    if (!trimmed) return '';

    let normalized = trimmed.replace(/[^0-9+]/g, '');
    if (normalized.startsWith('+')) {
        const rest = normalized.slice(1).replace(/[^0-9]/g, '');
        normalized = rest ? `+${rest}` : '';
    } else {
        normalized = normalized.replace(/[^0-9]/g, '');
    }

    return normalized ? `tel:${normalized}` : '';
}

function buildDirectionsUrl(address) {
    if (!address) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

async function loadAdminDashboard() {
    if (!authToken) {
        showPage('admin-login');
        return;
    }

    loadDashboardStats();
    loadAdminCars('sale');
    loadClientRequests();
}

async function loadDashboardStats() {
    console.log('loadDashboardStats called');
    
    // Retry helper function
    const retryLoad = (retries = 3, delay = 100) => {
        const tryLoad = async (attempt = 0) => {
            const statElements = {
                totalSale: document.getElementById('stat-total-sale'),
                availableSale: document.getElementById('stat-available-sale'),
                sold: document.getElementById('stat-sold'),
                rent: document.getElementById('stat-rent'),
                services: document.getElementById('stat-services'),
                newRequests: document.getElementById('stat-new-requests')
            };

            if (!statElements.totalSale) {
                if (attempt < retries) {
                    console.log(`Dashboard stats elements not found, retry ${attempt + 1}/${retries}...`);
                    setTimeout(() => tryLoad(attempt + 1), delay);
                    return;
                } else {
                    console.error('Dashboard stats elements not found after retries');
                    return;
                }
            }

            return statElements;
        };
        return tryLoad();
    };

    try {
        const statElements = await retryLoad();
        if (!statElements) return;

        console.log('Loading dashboard stats from API...');
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            console.log('Dashboard stats received:', stats);
            
            // Update stats with explicit value assignment
            const newRentRequests = stats.requests?.rent?.new ?? 0;
            const newSaleRequests = stats.requests?.sale?.new ?? 0;
            const servicesCount = stats.services?.total ?? 0;
            const updates = [
                { el: statElements.totalSale, value: stats.carsForSale?.total ?? 0 },
                { el: statElements.availableSale, value: stats.carsForSale?.available ?? 0 },
                { el: statElements.sold, value: stats.carsForSale?.sold ?? 0 },
                { el: statElements.rent, value: stats.rentCars?.total ?? 0 },
                { el: statElements.services, value: servicesCount },
                { el: statElements.newRequests, value: newRentRequests + newSaleRequests }
            ];

            updates.forEach(({ el, value }) => {
                if (el) {
                    el.textContent = String(value);
                    console.log(`Updated ${el.id} to ${value}`);
                }
            });
            
            console.log('All stats updated successfully');
        } else {
            const errorText = await response.text();
            console.error('Failed to load dashboard stats:', response.status, response.statusText, errorText);
            // Set stats to 0 on error
            if (statElements) {
                Object.values(statElements).forEach(el => {
                    if (el) el.textContent = '0';
                });
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Ensure stats show 0 on error
        const statIds = ['stat-total-sale', 'stat-available-sale', 'stat-sold', 'stat-rent', 'stat-new-requests'];
        statIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }
}

async function loadAdminCars(type) {
    try {
        const response = await fetch(`${API_BASE}/cars/${type}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const cars = await response.json();
            const containerId = type === 'sale' ? 'saleCarsList' : 'rentCarsList';
            displayAdminCars(cars, containerId, type);
        }
    } catch (error) {
        console.error('Error loading admin cars:', error);
    }
}

function displayAdminCars(cars, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (cars.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No cars found.</p>';
        return;
    }

    container.innerHTML = cars.map(car => {
        // Get car name - use brand/model for new cars, make/model for legacy
        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        const carName = carYear ? `${carYear} ${carBrand} ${carModel}` : `${carBrand} ${carModel}`;
        
        // Get price/daily rate - check for null/undefined, not falsy (0 is valid)
        let priceText = '';
        if (type === 'rent') {
            priceText = (car.dailyRate !== null && car.dailyRate !== undefined) 
                ? `$${car.dailyRate}/day` 
                : 'Price not set';
        } else {
            priceText = (car.price !== null && car.price !== undefined) 
                ? `$${car.price.toLocaleString()}` 
                : 'Price not set';
        }
        
        // Get mileage (only for sale cars) - check for null/undefined
        let mileageText = '';
        if (type === 'sale' && car.mileage !== null && car.mileage !== undefined) {
            mileageText = ` | ${car.mileage.toLocaleString()} miles`;
        } else if (type === 'rent' && car.numPersons !== null && car.numPersons !== undefined) {
            mileageText = ` | ${car.numPersons} persons`;
        }
        
        return `
        <div class="admin-car-item">
            <div>
                <h4>${carName}</h4>
                <p>${priceText}${mileageText} | 
                   <span class="status-${car.status}">${formatCarStatus(car.status)}</span></p>
            </div>
            <div class="admin-car-actions">
                <button class="btn-edit" onclick="editCar('${car._id}', '${type}')">Edit</button>
                ${type === 'sale' ? `<button class="btn-sold" onclick="markAsSold('${car._id}')" ${car.status === 'sold' ? 'disabled' : ''}>Mark Sold</button>` : ''}
                <button class="btn-delete" onclick="deleteCar('${car._id}', '${type}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

// Admin Services Functions
async function loadAdminServices() {
    try {
        const response = await fetch(`${API_BASE}/services/admin/all`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const services = await response.json();
            displayAdminServices(services);
        }
    } catch (error) {
        console.error('Error loading admin services:', error);
    }
}

function displayAdminServices(services) {
    const container = document.getElementById('servicesList');
    if (!container) return;

    if (!services || services.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No services found.</p>';
        return;
    }

    container.innerHTML = services.map(service => {
        return `
        <div class="admin-service-item">
            <div>
                <h4>${service.title}</h4>
                <p>${service.shortDescription.substring(0, 100)}${service.shortDescription.length > 100 ? '...' : ''}</p>
                <p style="font-size: 0.85rem; color: #999;">Order: ${service.order} | ${service.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <div class="admin-service-actions">
                <button class="btn-edit" onclick="editService('${service._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteService('${service._id}')">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

function openServiceForm(serviceId = null) {
    const form = document.getElementById('serviceForm');
    const modal = document.getElementById('serviceFormModal');
    const title = modal?.querySelector('.modal-title');
    const preview = document.getElementById('serviceImagePreview');
    
    if (!form || !modal || !title) return;

    if (serviceId) {
        // Edit mode
        title.textContent = 'Edit Service';
        form.dataset.serviceId = serviceId;
        if (preview) preview.innerHTML = ''; // Clear image preview
        loadServiceForEdit(serviceId);
    } else {
        // Add mode
        title.textContent = 'Add New Service';
        delete form.dataset.serviceId;
        form.reset();
        if (preview) preview.innerHTML = ''; // Clear image preview
        const imageInput = document.getElementById('serviceImages');
        if (imageInput) imageInput.value = ''; // Clear file input
    }

    modal.style.display = 'flex';
}

async function loadServiceForEdit(serviceId) {
    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const service = await response.json();
            document.getElementById('serviceTitle').value = service.title || '';
            document.getElementById('serviceShortDesc').value = service.shortDescription || '';
            document.getElementById('serviceFullDesc').value = service.fullDescription || '';
            document.getElementById('serviceIcon').value = service.icon || '';
            document.getElementById('serviceOrder').value = service.order || 0;
            document.getElementById('serviceIsActive').checked = service.isActive !== false;
            
            // Load existing images
            const preview = document.getElementById('serviceImagePreview');
            if (preview && service.images && service.images.length > 0) {
                preview.innerHTML = ''; // Clear preview
                displayServiceImagePreviews(service.images, 'serviceImagePreview');
            }
        } else {
            alert('Error loading service details');
        }
    } catch (error) {
        console.error('Error loading service for edit:', error);
        alert('Error loading service');
    }
}

async function handleServiceFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('serviceForm');
    const serviceId = form.dataset.serviceId;
    const method = serviceId ? 'PUT' : 'POST';
    const url = serviceId ? `${API_BASE}/services/${serviceId}` : `${API_BASE}/services`;

    // Collect images in order from preview
    const preview = document.getElementById('serviceImagePreview');
    const imageItems = preview?.querySelectorAll('.image-preview-item') || [];
    const images = Array.from(imageItems).map(item => {
        const img = item.querySelector('img');
        return img?.src || '';
    }).filter(Boolean);

    const formData = {
        title: document.getElementById('serviceTitle').value,
        shortDescription: document.getElementById('serviceShortDesc').value,
        fullDescription: document.getElementById('serviceFullDesc').value,
        icon: document.getElementById('serviceIcon').value || 'fas fa-cog',
        images: images,
        mainImage: images.length > 0 ? images[0] : null,
        order: parseInt(document.getElementById('serviceOrder').value) || 0,
        isActive: document.getElementById('serviceIsActive').checked
    };

    try {
        // Upload new images if any
        const imageInput = document.getElementById('serviceImages');
        if (imageInput?.files && imageInput.files.length > 0) {
            try {
                const newImageUrls = await uploadServiceImages(imageInput.files);
                formData.images = [...(formData.images || []), ...newImageUrls];
                formData.mainImage = formData.mainImage || (newImageUrls.length > 0 ? newImageUrls[0] : null);
            } catch (uploadError) {
                alert('Error uploading images: ' + uploadError.message);
                return;
            }
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (await handleApiResponse(response) === false) return;

        if (response.ok) {
            closeModal('serviceFormModal');
            document.getElementById('serviceImages').value = ''; // Clear file input
            loadAdminServices(); // Reload the services list
            alert(serviceId ? 'Service updated successfully' : 'Service created successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Error saving service');
        }
    } catch (error) {
        console.error('Error saving service:', error);
        alert('Error saving service');
    }
}

async function editService(serviceId) {
    openServiceForm(serviceId);
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (await handleApiResponse(response) === false) return;

        if (response.ok) {
            loadAdminServices(); // Reload the services list
            alert('Service deleted successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Error deleting service');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        alert('Error deleting service');
    }
}

// Service Image Handling
let uploadedServiceImageUrls = [];

function handleServiceImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('serviceImagePreview');
    if (!preview) return;

    const startIndex = preview.querySelectorAll('.image-preview-item').length;

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            createImagePreviewItem(preview, fileEvent.target.result, startIndex + index, false, 'serviceImagePreview');
        };
        reader.readAsDataURL(file);
    });
}

function displayServiceImagePreviews(imageUrls, previewId = 'serviceImagePreview') {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    const existingItems = preview.querySelectorAll('[data-existing="true"]');
    existingItems.forEach(item => item.remove());
    
    imageUrls.forEach((url, index) => {
        createImagePreviewItem(preview, url, index, true, previewId);
    });
}

async function uploadServiceImages(imageFiles) {
    if (!imageFiles || imageFiles.length === 0) {
        return [];
    }
    
    const formData = new FormData();
    Array.from(imageFiles).forEach(file => {
        formData.append('images', file);
    });
    
    try {
        const response = await fetch(`${API_BASE}/upload/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.urls || [];
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error uploading images');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
}

async function loadClientRequests(targetType = 'all') {
    if (!authToken) return;

    const typesToLoad = targetType === 'all' ? ['rent', 'sale'] : [targetType];

    try {
        const headers = { 'Authorization': `Bearer ${authToken}` };

        await Promise.all(typesToLoad.map(async (type) => {
            const pagination = requestPaginationState[type] || { page: 1, totalPages: 1, total: 0 };
            const params = new URLSearchParams({
                type,
                page: pagination.page.toString(),
                limit: REQUESTS_PER_PAGE.toString()
            });

            const response = await fetch(`${API_BASE}/admin/requests?${params.toString()}`, { headers });
            if (await handleApiResponse(response) === false) {
                return;
            }

            if (!response.ok) {
                console.error(`Error loading ${type} requests:`, response.statusText);
                return;
            }

            const result = await normalizeRequestResult(await response.json());

            if (result.totalPages > 0 && result.page > result.totalPages) {
                requestPaginationState[type].page = result.totalPages;
                await loadClientRequests(type);
                return;
            }

            displayClientRequests(result, type);
        }));
    } catch (error) {
        console.error('Error loading client requests:', error);
    }
}

function normalizeRequestResult(result) {
    if (Array.isArray(result)) {
        return {
            data: result,
            total: result.length,
            page: 1,
            totalPages: 1,
            limit: REQUESTS_PER_PAGE
        };
    }

    return {
        data: Array.isArray(result.data) ? result.data : [],
        total: typeof result.total === 'number' ? result.total : (Array.isArray(result.data) ? result.data.length : 0),
        page: result.page || 1,
        totalPages: result.totalPages || 1,
        limit: result.limit || REQUESTS_PER_PAGE
    };
}

function displayClientRequests(result, type) {
    const { data, total, page, totalPages } = result;
    requestPaginationState[type] = {
        page,
        totalPages: totalPages || 1,
        total
    };

    const containerId = type === 'rent' ? 'rentalRequestsList' : 'saleRequestsList';
    const counterId = type === 'rent' ? 'rentalRequestsCount' : 'saleRequestsCount';
    const container = document.getElementById(containerId);
    const counter = document.getElementById(counterId);

    if (counter) {
        counter.textContent = total;
    }

    if (!container) return;

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `<p class="request-empty">No ${type === 'rent' ? 'rental' : 'sale'} requests yet.</p>`;
        renderRequestPagination(type);
        return;
    }

    container.innerHTML = data.map(request => {
        const car = request.carId || {};
        const carNameParts = [
            car.year,
            car.brand || car.make,
            car.model
        ].filter(Boolean);
        const carName = carNameParts.length ? carNameParts.join(' ') : 'Vehicle removed';
        const submittedAt = request.createdAt ? new Date(request.createdAt).toLocaleString() : '—';
        const rentalDates = type === 'rent' && request.startDate && request.endDate
            ? `${new Date(request.startDate).toLocaleDateString()} → ${new Date(request.endDate).toLocaleDateString()}`
            : null;

        const normalizedStatus = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'].includes(request.status)
            ? request.status
            : (request.status === 'pending' ? 'new' : request.status === 'completed' ? 'closed' : 'new');
        const statusLabel = formatRequestStatusLabel(normalizedStatus);
        const statusOptions = REQUEST_STATUS_OPTIONS.map(option => `
            <option value="${option.value}" ${option.value === normalizedStatus ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');

        const messageHtml = request.message
            ? `<div class="request-message">${escapeHtml(request.message).replace(/\n/g, '<br>')}</div>`
            : '';

        return `
            <div class="request-card">
                <div class="request-card-header">
                    <div class="request-card-title">
                        <span class="request-car-name">${escapeHtml(carName)}</span>
                        <span class="request-type-badge ${type}">${type === 'rent' ? 'Rental request' : 'Sale request'}</span>
                    </div>
                    <span class="request-status-badge ${normalizedStatus}">${escapeHtml(statusLabel)}</span>
                </div>
                <div class="request-meta-grid">
                    <div class="request-meta-item">
                        <span class="request-meta-label">Client</span>
                        <span class="request-meta-value">${escapeHtml(request.clientName)}</span>
                    </div>
                    <div class="request-meta-item">
                        <span class="request-meta-label">Email</span>
                        <span class="request-meta-value">${escapeHtml(request.clientEmail)}</span>
                    </div>
                    <div class="request-meta-item">
                        <span class="request-meta-label">Phone</span>
                        <span class="request-meta-value">${escapeHtml(request.clientPhone)}</span>
                    </div>
                    <div class="request-meta-item">
                        <span class="request-meta-label">Submitted</span>
                        <span class="request-meta-value">${escapeHtml(submittedAt)}</span>
                    </div>
                    ${rentalDates ? `
                        <div class="request-meta-item">
                            <span class="request-meta-label">Rental window</span>
                            <span class="request-meta-value">${escapeHtml(rentalDates)}</span>
                        </div>` : ''}
                    ${(() => {
                        // Calculate and display price for both rental and sale requests
                        let priceHtml = '';
                        if (type === 'rent' && request.startDate && request.endDate) {
                            const start = new Date(request.startDate);
                            const end = new Date(request.endDate);
                            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                            let basePrice = request.customPrice !== null && request.customPrice !== undefined 
                                ? request.customPrice 
                                : (car.dailyRate ? car.dailyRate * days : 0);
                            const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                            const totalPrice = basePrice - discountAmount;
                            if (totalPrice > 0) {
                                priceHtml = `
                                    <div class="request-meta-item">
                                        <span class="request-meta-label">Total Price</span>
                                        <span class="request-meta-value request-price">${formatCurrency(totalPrice)}</span>
                                    </div>`;
                            }
                        } else if (type === 'sale') {
                            let basePrice = request.customPrice !== null && request.customPrice !== undefined 
                                ? request.customPrice 
                                : (car.price || 0);
                            const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                            const totalPrice = basePrice - discountAmount;
                            if (totalPrice > 0) {
                                priceHtml = `
                                    <div class="request-meta-item">
                                        <span class="request-meta-label">Sale Price</span>
                                        <span class="request-meta-value request-price">${formatCurrency(totalPrice)}</span>
                                    </div>`;
                            }
                        }
                        return priceHtml;
                    })()}
                </div>
                ${messageHtml}
                <div class="request-actions">
                    <button class="btn-primary" onclick="showRequestDetails('${request._id}', '${type}')" style="margin-right: 10px;">View Details</button>
                    <label for="status-${request._id}">Update status</label>
                    <select id="status-${request._id}" class="request-status-select" onchange="updateRequestStatus('${request._id}', this.value)">
                        ${statusOptions}
                    </select>
                    <button class="btn-delete" onclick="deleteRequest('${request._id}', '${type}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    renderRequestPagination(type);
}

function renderRequestPagination(type) {
    const paginationState = requestPaginationState[type];
    const containerId = type === 'rent' ? 'rentalRequestsPagination' : 'saleRequestsPagination';
    const container = document.getElementById(containerId);
    if (!container || !paginationState) return;

    const { page, totalPages, total } = paginationState;

    if (total <= REQUESTS_PER_PAGE) {
        container.innerHTML = '';
        container.style.display = total > 0 ? 'flex' : 'none';
        return;
    }

    container.style.display = 'flex';

    const start = (page - 1) * REQUESTS_PER_PAGE + 1;
    const end = Math.min(page * REQUESTS_PER_PAGE, total);

    container.innerHTML = `
        <button class="pagination-button" onclick="changeRequestPage('${type}', 'prev')" ${page === 1 ? 'disabled' : ''}>&lt; Prev</button>
        <span class="pagination-info">Showing ${start}-${end} of ${total} • Page ${page} of ${totalPages}</span>
        <button class="pagination-button" onclick="changeRequestPage('${type}', 'next')" ${page === totalPages ? 'disabled' : ''}>Next &gt;</button>
    `;
}

function changeRequestPage(type, direction) {
    const state = requestPaginationState[type];
    if (!state) return;

    let newPage = state.page;
    if (direction === 'prev') {
        newPage = Math.max(1, state.page - 1);
    } else if (direction === 'next') {
        newPage = Math.min(state.totalPages, state.page + 1);
    } else if (typeof direction === 'number') {
        newPage = Math.min(Math.max(direction, 1), state.totalPages);
    }

    if (newPage === state.page) return;
    requestPaginationState[type].page = newPage;
    loadClientRequests(type);
}

async function updateRequestStatus(requestId, newStatus, forceAccept = false) {
    if (!authToken) {
        alert('You need to be logged in as admin to update request status.');
        return;
    }

    // Check for overlapping accepted requests if trying to accept
    if (newStatus === 'accepted' && !forceAccept) {
        try {
            // First, get the current request details
            const requestResponse = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!requestResponse.ok) {
                alert('Error loading request details');
                return;
            }

            const currentRequest = await requestResponse.json();
            
            // Only check overlaps for rental requests with dates
            if (currentRequest.requestType === 'rent' && currentRequest.startDate && currentRequest.endDate) {
                // Check for overlapping accepted requests
                const overlapResponse = await fetch(`${API_BASE}/admin/requests/${requestId}/check-overlap`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (overlapResponse.ok) {
                    const overlapData = await overlapResponse.json();
                    if (overlapData.hasOverlap && overlapData.conflictingRequests && overlapData.conflictingRequests.length > 0) {
                        // Build conflict message
                        const conflictDetails = overlapData.conflictingRequests.map(req => {
                            const carName = req.carId ? 
                                `${req.carId.year || ''} ${req.carId.brand || req.carId.make || ''} ${req.carId.model || ''}`.trim() : 
                                'Unknown Car';
                            const startDate = new Date(req.startDate).toLocaleDateString();
                            const endDate = new Date(req.endDate).toLocaleDateString();
                            return `\n- ${req.clientName} (${startDate} to ${endDate})`;
                        }).join('');

                        const conflictTitle = 'Overlapping Accepted Request';
                        const conflictMessage = `WARNING: This request overlaps with ${overlapData.conflictingRequests.length} already accepted request(s) for the same car.`;
                        const conflictDetailsList = overlapData.conflictingRequests.map(req => {
                            const startDate = new Date(req.startDate).toLocaleDateString();
                            const endDate = new Date(req.endDate).toLocaleDateString();
                            return `${req.clientName} (${startDate} to ${endDate})`;
                        });
                        
                        const forceConfirm = await showCustomConfirm(
                            conflictTitle,
                            conflictMessage,
                            conflictDetailsList,
                            'warning'
                        );
                        if (!forceConfirm) {
                            // Reset dropdown to previous value
                            const selectElement = document.getElementById(`status-${requestId}`);
                            if (selectElement) {
                                // Find the previous status from the request card
                                const requestCard = selectElement.closest('.request-card');
                                if (requestCard) {
                                    const statusBadge = requestCard.querySelector('.request-status-badge');
                                    if (statusBadge) {
                                        // Try to get previous status from class or data attribute
                                        const prevStatus = currentRequest.status || 'new';
                                        selectElement.value = prevStatus;
                                    }
                                }
                            }
                            return;
                        }
                        // Proceed with force accept
                        forceAccept = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking overlaps:', error);
            // Continue with status update even if overlap check fails
        }
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus, force: forceAccept })
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const updatedRequest = await response.json();
            const requestType = updatedRequest?.requestType || 'rent';
            
            // Reload the requests list
            loadClientRequests(requestType);
            
            // Reload calendar view if it's a rental request and calendar is visible
            const rentalRequestsSection = document.getElementById('rental-requests');
            const calendarView = document.getElementById('rental-calendar-view');
            if (requestType === 'rent' && rentalRequestsSection && rentalRequestsSection.style.display !== 'none') {
                if (calendarView && calendarView.style.display !== 'none') {
                    loadRentalCalendarView();
                }
            }
            
            // Reload dashboard stats
            loadDashboardStats();
        } else {
            const data = await response.json().catch(() => ({}));
            
            // Handle overlap conflict from backend
            if (response.status === 409 && data.conflictingRequests && data.conflictingRequests.length > 0) {
                const conflictDetails = data.conflictingRequests.map(req => {
                    const carName = req.carId ? 
                        `${req.carId.year || ''} ${req.carId.brand || req.carId.make || ''} ${req.carId.model || ''}`.trim() : 
                        'Unknown Car';
                    const startDate = new Date(req.startDate).toLocaleDateString();
                    const endDate = new Date(req.endDate).toLocaleDateString();
                    return `\n- ${req.clientName} (${startDate} to ${endDate})`;
                }).join('');

                const conflictTitle = 'Overlapping Accepted Request';
                const conflictMessage = `WARNING: This request overlaps with ${data.conflictingRequests.length} already accepted request(s) for the same car.`;
                const conflictDetailsList = data.conflictingRequests.map(req => {
                    const startDate = new Date(req.startDate).toLocaleDateString();
                    const endDate = new Date(req.endDate).toLocaleDateString();
                    return `${req.clientName} (${startDate} to ${endDate})`;
                });
                
                const forceConfirm = await showCustomConfirm(
                    conflictTitle,
                    conflictMessage,
                    conflictDetailsList,
                    'warning'
                );
                if (forceConfirm) {
                    // Retry with force flag
                    return updateRequestStatus(requestId, newStatus, true);
                } else {
                    // Reset dropdown to previous value
                    const selectElement = document.getElementById(`status-${requestId}`);
                    if (selectElement) {
                        // Try to get the current request status
                        try {
                            const requestResponse = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
                                headers: {
                                    'Authorization': `Bearer ${authToken}`
                                }
                            });
                            if (requestResponse.ok) {
                                const currentRequest = await requestResponse.json();
                                selectElement.value = currentRequest.status || 'new';
                            }
                        } catch (e) {
                            console.error('Error resetting dropdown:', e);
                        }
                    }
                    return;
                }
            }
            
            alert(data.message || 'Error updating request status');
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status');
    }
}

// Make updateRequestStatus globally accessible for onclick handlers
window.updateRequestStatus = updateRequestStatus;

async function deleteRequest(requestId, type) {
    if (!authToken) {
        alert('You need to be logged in as admin to delete requests.');
        return;
    }

    const confirmed = await showCustomConfirm(
        'Delete Request',
        'Are you sure you want to delete this request? This action cannot be undone.',
        null,
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            const deletedType = data?.request?.requestType || type;
            loadClientRequests(deletedType);
            loadDashboardStats();
        } else {
            alert('Error deleting request');
        }
    } catch (error) {
        console.error('Error deleting request:', error);
        alert('Error deleting request');
    }
}

// Make deleteRequest globally accessible for onclick handlers
window.deleteRequest = deleteRequest;

// Vehicle options list
const VEHICLE_OPTIONS = [
    'Navigation System', '17 Speakers', 'AM/FM radio: SiriusXM', 'CD player', 'DVD-Audio',
    'Radio data system', 'Radio: AM/FM/XM/HD/CD/MP3 Audio System', 'Air Conditioning',
    'Automatic temperature control', 'Front dual zone A/C', 'Rear window defroster',
    'Heads-Up Display', 'Memory seat', 'Power driver seat', 'Power steering', 'Power windows',
    'Remote keyless entry', 'Steering wheel memory', 'Steering wheel mounted audio controls',
    'Adaptive suspension', 'Auto-leveling suspension', 'Four wheel independent suspension',
    'Speed-sensing steering', 'Traction control', '4-Wheel Disc Brakes', 'ABS brakes',
    'Anti-whiplash front head restraints', 'Dual front impact airbags', 'Dual front side impact airbags',
    'Emergency communication system: Genesis Connected Services', 'Front anti-roll bar', 'Knee airbag',
    'Low tire pressure warning', 'Occupant sensing airbag', 'Overhead airbag', 'Rear anti-roll bar',
    'Rear side impact airbag', 'Power moonroof', 'Blind spot sensor: warning', 'Brake assist',
    'Electronic Stability Control', 'Exterior Parking Camera Rear', 'Auto High-beam Headlights',
    'Delay-off headlights', 'Fully automatic headlights', 'First Aid Kit', 'Panic alarm',
    'Security system', 'Distance-Pacing Cruise Control', 'Speed control', 'Auto-dimming door mirrors',
    'Bodyside moldings', 'Bumpers: body-color', 'Heated door mirrors', 'Power door mirrors',
    'Turn signal indicator mirrors', '12-Way Power Heated & Vented Sport Front Seats',
    'Auto tilt-away steering wheel', 'Auto-dimming Rear-View mirror', 'Carpeted Floor Mats',
    'Compass', 'Driver door bin', 'Driver vanity mirror', 'Front reading lights',
    'Garage door transmitter: HomeLink', 'Illuminated entry', 'Leather Shift Knob',
    'Leather steering wheel', 'Outside temperature display', 'Overhead console',
    'Passenger vanity mirror', 'Rear reading lights', 'Rear seat center armrest',
    'Reversible Cargo Tray', 'Sun blinds', 'Tachometer', 'Telescoping steering wheel',
    'Tilt steering wheel', 'Trip computer', 'Front Bucket Seats', 'Front Center Armrest',
    'Heated front seats', 'Heated rear seats', 'Power passenger seat',
    'Premium Leather Seating Surfaces', 'Ventilated front seats', 'Passenger door bin',
    'Alloy wheels', 'Rear Window Blind', 'Rain sensing wipers', 'Speed-Sensitive Wipers'
];

async function loadBrands() {
    try {
        const response = await fetch(`${API_BASE}/brands`);
        const brands = await response.json();
        const brandSelect = document.getElementById('carBrand');
        brandSelect.innerHTML = '<option value="">Select Brand</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.name;
            option.textContent = brand.name;
            brandSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

async function loadModels(brandName) {
    try {
        const response = await fetch(`${API_BASE}/brands/${encodeURIComponent(brandName)}/models`);
        const models = await response.json();
        const modelSelect = document.getElementById('carModel');
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

function populateVehicleOptions() {
    const container = document.getElementById('vehicleOptionsContainer');
    container.innerHTML = '';
    VEHICLE_OPTIONS.forEach(option => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.name = 'vehicleOptions';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(option));
        container.appendChild(label);
    });
}

function openCarForm(type, carId = null) {
    const modal = document.getElementById('carFormModal');
    const form = document.getElementById('carForm');
    const title = document.getElementById('carFormTitle');
    
    hideCarFormError();
    form.reset();
    document.getElementById('carId').value = carId || '';
    document.getElementById('carType').value = type;
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreviewRent').innerHTML = '';
    
    // Load brands and populate vehicle options
    loadBrands();
    if (type === 'sale') {
        populateVehicleOptions();
    }
    
    // Show/hide fields based on type
    const saleFields = document.getElementById('saleCarFields');
    const rentFields = document.getElementById('rentCarFields');
    
    // Get all required fields in each section
    const saleRequiredFields = saleFields.querySelectorAll('[required]');
    const rentRequiredFields = rentFields.querySelectorAll('[required]');
    
    if (type === 'rent') {
        saleFields.style.display = 'none';
        rentFields.style.display = 'block';
        title.textContent = carId ? 'Edit Rental Car' : 'Add Rental Car';
        
        // Remove required from sale fields, add to rent fields
        saleRequiredFields.forEach(field => {
            field.removeAttribute('required');
            field.setAttribute('data-was-required', 'true');
        });
        rentRequiredFields.forEach(field => {
            field.setAttribute('required', 'required');
        });
    } else {
        saleFields.style.display = 'block';
        rentFields.style.display = 'none';
        title.textContent = carId ? 'Edit Car' : 'Add Car for Sale';
        
        // Remove required from rent fields, add to sale fields
        rentRequiredFields.forEach(field => {
            field.removeAttribute('required');
            field.setAttribute('data-was-required', 'true');
        });
        saleRequiredFields.forEach(field => {
            field.setAttribute('required', 'required');
        });
    }

    // Load models when brand changes
    document.getElementById('carBrand').addEventListener('change', function() {
        if (this.value) {
            loadModels(this.value);
        }
    });

    if (carId) {
        loadCarForEdit(carId);
    }

    modal.style.display = 'block';
}

async function loadCarForEdit(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`);
        const car = await response.json();

        // Common fields
        document.getElementById('carBrand').value = car.brand || car.make || '';
        if (car.brand || car.make) {
            await loadModels(car.brand || car.make);
            setTimeout(() => {
                document.getElementById('carModel').value = car.model || '';
            }, 100);
        }
        document.getElementById('carDescription').value = car.description || '';
        
        if (car.type === 'sale') {
            document.getElementById('carModelVersion').value = car.modelVersion || '';
            document.getElementById('carMileage').value = car.mileage || '';
            document.getElementById('carGearbox').value = car.gearbox || '';
            if (car.firstRegistrationDate) {
                const date = new Date(car.firstRegistrationDate);
                document.getElementById('carFirstRegistration').value = date.toISOString().split('T')[0];
            }
            document.getElementById('carFuelType').value = car.fuelType || '';
            document.getElementById('carPower').value = car.power || '';
            document.getElementById('carPrice').value = car.price || '';
            
            // Vehicle options
            if (car.vehicleOptions && Array.isArray(car.vehicleOptions)) {
                car.vehicleOptions.forEach(option => {
                    const checkbox = document.querySelector(`input[name="vehicleOptions"][value="${option}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // Images
            if (car.images && Array.isArray(car.images)) {
                displayImagePreviews(car.images, 'imagePreview');
            } else if (car.image) {
                displayImagePreviews([car.image], 'imagePreview');
            }
        } else {
            document.getElementById('carGearboxRent').value = car.gearbox || '';
            document.getElementById('carFuelTypeRent').value = car.fuelType || '';
            document.getElementById('carNumPersons').value = car.numPersons || '';
            document.getElementById('carDailyRate').value = car.dailyRate || '';
            
            // Images for rental cars
            if (car.images && Array.isArray(car.images)) {
                displayImagePreviews(car.images, 'imagePreviewRent');
            } else if (car.image) {
                displayImagePreviews([car.image], 'imagePreviewRent');
            }
        }
    } catch (error) {
        console.error('Error loading car:', error);
    }
}

function displayImagePreviews(imageUrls, previewId = 'imagePreview') {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    // Clear only existing images, keep newly selected ones
    const existingItems = preview.querySelectorAll('[data-existing="true"]');
    existingItems.forEach(item => item.remove());
    
    imageUrls.forEach((url, index) => {
        createImagePreviewItem(preview, url, index, true, previewId);
    });
}

function createImagePreviewItem(container, source, index, isExisting = false, containerId = 'imagePreview') {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.setAttribute('data-index', index);
    if (isExisting) {
        item.setAttribute('data-existing', 'true');
    } else {
        item.setAttribute('data-new', 'true');
    }
    
    const img = document.createElement('img');
    img.src = source;
    img.className = 'image-preview-img';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    
    const controls = document.createElement('div');
    controls.className = 'image-preview-controls';
    
    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'image-preview-btn image-preview-btn-up';
    btnUp.setAttribute('aria-label', 'Move image up');
    btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        moveImageUp(item, containerId);
    });
    
    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'image-preview-btn image-preview-btn-down';
    btnDown.setAttribute('aria-label', 'Move image down');
    btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        moveImageDown(item, containerId);
    });
    
    const btnMain = document.createElement('button');
    btnMain.type = 'button';
    btnMain.className = 'image-preview-btn image-preview-btn-main';
    btnMain.setAttribute('aria-label', 'Mark as main image');
    btnMain.addEventListener('click', (e) => {
        e.preventDefault();
        markMainImage(item, containerId);
    });
    
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'image-preview-btn image-preview-btn-delete';
    btnDelete.setAttribute('aria-label', 'Delete image');
    btnDelete.addEventListener('click', (e) => {
        e.preventDefault();
        deleteImage(item, containerId);
    });
    
    controls.appendChild(btnUp);
    controls.appendChild(btnDown);
    controls.appendChild(btnMain);
    controls.appendChild(btnDelete);
    
    item.appendChild(img);
    item.appendChild(controls);
    container.appendChild(item);
}

function moveImageUp(item, containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));
    const currentIndex = items.indexOf(item);
    
    if (currentIndex > 0) {
        const prevItem = items[currentIndex - 1];
        container.insertBefore(item, prevItem);
        updateImageIndices(container);
    }
}

function moveImageDown(item, containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));
    const currentIndex = items.indexOf(item);
    
    if (currentIndex < items.length - 1) {
        const nextItem = items[currentIndex + 1];
        container.insertBefore(nextItem, item);
        updateImageIndices(container);
    }
}

function markMainImage(item, containerId) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.image-preview-item');
    
    items.forEach(i => i.classList.remove('main-image'));
    item.classList.add('main-image');
}

function deleteImage(item, containerId) {
    item.remove();
    const container = document.getElementById(containerId);
    updateImageIndices(container);
}

function updateImageIndices(container) {
    const items = container.querySelectorAll('.image-preview-item');
    items.forEach((item, index) => {
        item.setAttribute('data-index', index);
    });
}

function getOrderedImages(containerId) {
    const container = document.getElementById(containerId);
    const items = Array.from(container.querySelectorAll('.image-preview-item'));
    
    return items.map(item => ({
        src: item.querySelector('.image-preview-img').src,
        isMain: item.classList.contains('main-image'),
        isNew: item.hasAttribute('data-new'),
        isExisting: item.hasAttribute('data-existing')
    }));
}

// Handle image file selection for sale cars
document.getElementById('carImages')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreview');
    if (preview) {
        let startIndex = preview.querySelectorAll('.image-preview-item').length;
        
        files.forEach((file, fileIndex) => {
            const reader = new FileReader();
            reader.onload = function(fileEvent) {
                createImagePreviewItem(preview, fileEvent.target.result, startIndex + fileIndex, false, 'imagePreview');
            };
            reader.readAsDataURL(file);
        });
    }
});

// Handle image file selection for rental cars
document.getElementById('carImagesRent')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreviewRent');
    if (preview) {
        let startIndex = preview.querySelectorAll('.image-preview-item').length;
        
        files.forEach((file, fileIndex) => {
            const reader = new FileReader();
            reader.onload = function(fileEvent) {
                createImagePreviewItem(preview, fileEvent.target.result, startIndex + fileIndex, false, 'imagePreviewRent');
            };
            reader.readAsDataURL(file);
        });
    }
});

async function uploadImages(imageFiles) {
    if (!imageFiles || imageFiles.length === 0) {
        return [];
    }
    
    const formData = new FormData();
    Array.from(imageFiles).forEach(file => {
        formData.append('images', file);
    });
    
    try {
        const response = await fetch(`${API_BASE}/upload/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.urls || [];
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error uploading images');
        }
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
}

function showCarFormError(message) {
    const errorDiv = document.getElementById('carFormError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        alert(message);
    }
}

function hideCarFormError() {
    const errorDiv = document.getElementById('carFormError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

async function handleCarFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent form validation bubbles
    hideCarFormError();
    
    const carId = document.getElementById('carId').value;
    const type = document.getElementById('carType').value;
    
    // Remove required from hidden fields to prevent browser validation
    if (type === 'sale') {
        const rentFields = document.getElementById('rentCarFields');
        rentFields.querySelectorAll('[required]').forEach(field => {
            field.removeAttribute('required');
        });
    } else {
        const saleFields = document.getElementById('saleCarFields');
        saleFields.querySelectorAll('[required]').forEach(field => {
            field.removeAttribute('required');
        });
    }
    
    // Validate required fields
    const brand = document.getElementById('carBrand').value.trim();
    const model = document.getElementById('carModel').value.trim();
    
    if (!brand) {
        showCarFormError('Please select a brand');
        return;
    }
    
    if (!model) {
        showCarFormError('Please select a model');
        return;
    }
    
    // Upload images first if any new files are selected
    let uploadedImageUrls = [];
    try {
        const imageInput = type === 'sale' ? document.getElementById('carImages') : document.getElementById('carImagesRent');
        if (imageInput && imageInput.files.length > 0) {
            uploadedImageUrls = await uploadImages(imageInput.files);
        }
    } catch (error) {
        showCarFormError('Error uploading images: ' + error.message);
        return;
    }
    
    // Get ordered images from preview
    const previewId = type === 'sale' ? 'imagePreview' : 'imagePreviewRent';
    const orderedImages = getOrderedImages(previewId);
    
    const carData = {
        brand: brand,
        model: model,
        type: type,
        status: 'available', // Ensure status is set
        description: document.getElementById('carDescription').value || ''
    };

    // Build final image array with proper ordering and main image designation
    const finalImages = [];
    let mainImageUrl = null;
    
    orderedImages.forEach((imgInfo, index) => {
        const url = imgInfo.src;
        // Skip data: URLs (new images that need to be uploaded)
        if (!url.startsWith('data:')) {
            finalImages.push(url);
            // Set main image if marked
            if (imgInfo.isMain) {
                mainImageUrl = url;
            }
        }
    });
    
    // Add newly uploaded images in order
    uploadedImageUrls.forEach(url => {
        finalImages.push(url);
    });
    
    if (finalImages.length > 0) {
        carData.images = finalImages;
        // Set the main image to the first image if no specific main image was marked
        carData.image = mainImageUrl || finalImages[0];
    }

    if (type === 'sale') {
        const mileage = document.getElementById('carMileage').value;
        const gearbox = document.getElementById('carGearbox').value;
        const fuelType = document.getElementById('carFuelType').value;
        const price = document.getElementById('carPrice').value;
        
        if (!mileage) {
            showCarFormError('Please enter mileage');
            return;
        }
        if (!gearbox) {
            showCarFormError('Please select gearbox');
            return;
        }
        if (!fuelType) {
            showCarFormError('Please select fuel type');
            return;
        }
        if (!price) {
            showCarFormError('Please enter price');
            return;
        }
        
        carData.modelVersion = document.getElementById('carModelVersion').value || '';
        carData.mileage = parseInt(mileage) || 0;
        carData.gearbox = gearbox;
        const firstReg = document.getElementById('carFirstRegistration').value;
        if (firstReg) {
            carData.firstRegistrationDate = new Date(firstReg);
        }
        carData.fuelType = fuelType;
        const power = document.getElementById('carPower').value;
        if (power) carData.power = parseInt(power);
        carData.price = parseFloat(price) || 0;
        
        // Vehicle options
        const selectedOptions = Array.from(document.querySelectorAll('input[name="vehicleOptions"]:checked'))
            .map(cb => cb.value);
        carData.vehicleOptions = selectedOptions;
    } else {
        const gearbox = document.getElementById('carGearboxRent').value;
        const fuelType = document.getElementById('carFuelTypeRent').value;
        const numPersons = document.getElementById('carNumPersons').value;
        const dailyRate = document.getElementById('carDailyRate').value;
        
        if (!gearbox) {
            showCarFormError('Please select gearbox');
            return;
        }
        if (!fuelType) {
            showCarFormError('Please select fuel type');
            return;
        }
        if (!numPersons) {
            showCarFormError('Please enter number of persons');
            return;
        }
        if (!dailyRate) {
            showCarFormError('Please enter price per day');
            return;
        }
        
        carData.gearbox = gearbox;
        carData.fuelType = fuelType;
        carData.numPersons = parseInt(numPersons) || 0;
        carData.dailyRate = parseFloat(dailyRate) || 0;
    }

    // Check authentication
    if (!authToken) {
        showCarFormError('You must be logged in to save a car. Please log in first.');
        return;
    }

    try {
        const url = carId ? `${API_BASE}/cars/${carId}` : `${API_BASE}/cars`;
        const method = carId ? 'PUT' : 'POST';

        console.log('Saving car:', { url, method, carData, authToken: authToken ? 'present' : 'missing' });

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(carData)
        });

        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 500));
            showCarFormError('Server returned an error. Status: ' + response.status + '. Check console for details.');
            return;
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            hideCarFormError();
            document.getElementById('carFormModal').style.display = 'none';
            // Small delay to ensure modal is closed before reloading
            setTimeout(() => {
                loadAdminCars(type);
                if (type === 'sale') {
                    loadCarsForSale();
                } else {
                    loadCarsForRent();
                }
            }, 100);
        } else {
            console.error('Car save error:', data);
            const errorMsg = data.message || data.error || 'Unknown error. Please check console for details.';
            showCarFormError('Error saving car: ' + errorMsg);
        }
    } catch (error) {
        console.error('Error saving car:', error);
        showCarFormError('Error saving car: ' + error.message);
    }
}

// Add brand button handler
document.getElementById('addBrandBtn')?.addEventListener('click', function() {
    document.getElementById('newBrandName').value = '';
    openModal('addBrandModal');
});

// Add brand form handler
document.getElementById('addBrandForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const brandName = document.getElementById('newBrandName').value.trim();
    
    if (!brandName) {
        alert('Please enter a brand name');
        return;
    }
    
    if (!authToken) {
        alert('You must be logged in to add a brand. Please log in first.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/brands`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name: brandName })
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            alert('Error adding brand: Server returned an error page. Please check console for details.');
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            await loadBrands();
            document.getElementById('carBrand').value = brandName;
            closeModal('addBrandModal');
        } else {
            console.error('Brand add error:', data);
            alert('Error adding brand: ' + (data.message || 'Unknown error. Please check console for details.'));
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        alert('Error adding brand: ' + error.message);
    }
});

// Add model button handler
document.getElementById('addModelBtn')?.addEventListener('click', function() {
    const brandName = document.getElementById('carBrand').value;
    if (!brandName) {
        alert('Please select a brand first');
        return;
    }
    
    document.getElementById('selectedBrandName').value = brandName;
    document.getElementById('newModelName').value = '';
    openModal('addModelModal');
});

// Add model form handler
document.getElementById('addModelForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const brandName = document.getElementById('selectedBrandName').value.trim();
    const modelName = document.getElementById('newModelName').value.trim();
    
    if (!modelName) {
        alert('Please enter a model name');
        return;
    }
    
    if (!brandName) {
        alert('Brand name is missing');
        return;
    }
    
    if (!authToken) {
        alert('You must be logged in to add a model. Please log in first.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/brands/${encodeURIComponent(brandName)}/models`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name: modelName })
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            alert('Error adding model: Server returned an error page. Please check console for details.');
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            await loadModels(brandName);
            document.getElementById('carModel').value = modelName;
            closeModal('addModelModal');
        } else {
            console.error('Model add error:', data);
            alert('Error adding model: ' + (data.message || 'Unknown error. Please check console for details.'));
        }
    } catch (error) {
        console.error('Error adding model:', error);
        alert('Error adding model: ' + error.message);
    }
});

async function editCar(carId, type) {
    openCarForm(type, carId);
}

async function deleteCar(carId, type) {
    const confirmed = await showCustomConfirm(
        'Delete Car',
        'Are you sure you want to delete this car? This action cannot be undone.',
        null,
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/cars/${carId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            loadAdminCars(type);
            if (type === 'sale') {
                loadCarsForSale();
            } else {
                loadCarsForRent();
            }
        } else {
            alert('Error deleting car');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting car');
    }
}

async function markAsSold(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars/${carId}/sold`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            loadAdminCars('sale');
            loadCarsForSale();
        } else {
            alert('Error marking car as sold');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error marking car as sold');
    }
}

function updateContactPageWithSettings(settings = {}) {
    const phone = settings.phoneNumber || '';
    const email = settings.emailAddress || '';
    const address = settings.address || '';
    const businessHours = settings.businessHours || '';

    const contactPhoneEl = document.getElementById('contactPhone');
    if (contactPhoneEl) {
        contactPhoneEl.textContent = phone;
    }

    const contactEmailEl = document.getElementById('contactEmail');
    if (contactEmailEl) {
        contactEmailEl.textContent = email;
    }

    const contactAddressEl = document.getElementById('contactAddress');
    if (contactAddressEl) {
        contactAddressEl.textContent = address;
    }

    const contactEmailInput = document.getElementById('contactEmailInput');
    if (contactEmailInput && email) {
        contactEmailInput.placeholder = email;
    }

    const bringMeHereBtn = document.getElementById('bringMeHereBtn');
    if (bringMeHereBtn && address) {
        bringMeHereBtn.setAttribute('data-address', address);
    }

    const businessHoursDisplay = document.getElementById('businessHoursDisplay');
    if (businessHoursDisplay && businessHours) {
        businessHoursDisplay.innerHTML = businessHours.replace(/\n/g, '<br>');
    }
}

// Rental Calendar View
// Initialize calendar month to current month (1st day of current month)
let currentCalendarMonth = new Date();
currentCalendarMonth.setDate(1);
currentCalendarMonth.setHours(0, 0, 0, 0);
let calendarRentalRequests = [];
let calendarCars = [];

function initializeRentalCalendarView() {
    // View toggle buttons
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarView = document.getElementById('rental-calendar-view');
    const listView = document.getElementById('rental-list-view');

    if (calendarViewBtn && listViewBtn) {
        calendarViewBtn.addEventListener('click', () => {
            calendarViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            if (calendarView) calendarView.style.display = 'block';
            if (listView) listView.style.display = 'none';
            loadRentalCalendarView();
        });

        listViewBtn.addEventListener('click', () => {
            listViewBtn.classList.add('active');
            calendarViewBtn.classList.remove('active');
            if (calendarView) calendarView.style.display = 'none';
            if (listView) listView.style.display = 'block';
        });
    }

    // Month navigation
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            const year = currentCalendarMonth.getFullYear();
            const month = currentCalendarMonth.getMonth();
            // Create new date for previous month, ensuring it's the 1st day
            currentCalendarMonth = new Date(year, month - 1, 1);
            currentCalendarMonth.setHours(0, 0, 0, 0);
            loadRentalCalendarView();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            const year = currentCalendarMonth.getFullYear();
            const month = currentCalendarMonth.getMonth();
            // Create new date for next month, ensuring it's the 1st day
            currentCalendarMonth = new Date(year, month + 1, 1);
            currentCalendarMonth.setHours(0, 0, 0, 0);
            loadRentalCalendarView();
        });
    }

    // Initial load
    loadRentalCalendarView();
}

async function loadRentalCalendarView() {
    if (!authToken) {
        const tableauContainer = document.getElementById('rentalCalendarTableau');
        if (tableauContainer) {
            tableauContainer.innerHTML = '<div class="calendar-error">Please log in to view the calendar.</div>';
        }
        return;
    }

    const tableauContainer = document.getElementById('rentalCalendarTableau');
    if (!tableauContainer) return;

    tableauContainer.innerHTML = '<div class="calendar-loading">Loading calendar...</div>';

    try {
        // Load all rental cars (this endpoint may not require auth, but sending it doesn't hurt)
        let carsResponse;
        try {
            carsResponse = await fetch(`${API_BASE}/cars/rent`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch (fetchError) {
            console.error('Network error fetching cars:', fetchError);
            throw new Error('Unable to connect to server. Please check if the server is running.');
        }

        if (await handleApiResponse(carsResponse) === false) {
            tableauContainer.innerHTML = '<div class="calendar-error">Authentication required. Please log in again.</div>';
            return;
        }

        if (!carsResponse.ok) {
            const errorText = await carsResponse.text().catch(() => 'Unknown error');
            console.error('Failed to load cars response:', carsResponse.status, errorText);
            throw new Error(`Failed to load cars: ${carsResponse.status}`);
        }

        calendarCars = await carsResponse.json();

        // Load all rental requests (without pagination for calendar view)
        let requestsResponse;
        try {
            requestsResponse = await fetch(`${API_BASE}/admin/requests?type=rent&limit=1000`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch (fetchError) {
            console.error('Network error fetching requests:', fetchError);
            throw new Error('Unable to connect to server. Please check if the server is running.');
        }

        if (await handleApiResponse(requestsResponse) === false) {
            tableauContainer.innerHTML = '<div class="calendar-error">Authentication required. Please log in again.</div>';
            return;
        }

        if (!requestsResponse.ok) {
            const errorText = await requestsResponse.text().catch(() => 'Unknown error');
            console.error('Failed to load requests response:', requestsResponse.status, errorText);
            throw new Error(`Failed to load rental requests: ${requestsResponse.status}`);
        }

        const result = await requestsResponse.json();
        calendarRentalRequests = Array.isArray(result) ? result : (result.data || []);
        
        // Filter out requests with invalid dates
        calendarRentalRequests = calendarRentalRequests.filter(req => {
            if (!req.startDate || !req.endDate) return false;
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            return !isNaN(start.getTime()) && !isNaN(end.getTime());
        });

        renderCalendarTableau();
    } catch (error) {
        console.error('Error loading calendar view:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cars: calendarCars?.length,
            requests: calendarRentalRequests?.length
        });
        
        let errorMessage = 'Error loading calendar. Please try again.';
        if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('Unable to connect')) {
                errorMessage = 'Unable to connect to server. Please check your connection and ensure the server is running.';
            } else if (error.message.includes('401') || error.message.includes('Authentication')) {
                errorMessage = 'Authentication required. Please log in again.';
            } else {
                errorMessage = `Error loading calendar: ${error.message}`;
            }
        }
        
        tableauContainer.innerHTML = `<div class="calendar-error">${errorMessage}</div>`;
    }
}

function renderCalendarTableau() {
    const tableauContainer = document.getElementById('rentalCalendarTableau');
    const monthTitle = document.getElementById('calendarMonthTitle');
    
    if (!tableauContainer) {
        console.error('Calendar tableau container not found');
        return;
    }
    
    try {

    // Set month title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthTitle) {
        monthTitle.textContent = `${monthNames[currentCalendarMonth.getMonth()]} ${currentCalendarMonth.getFullYear()}`;
    }

    // Get all days in the month
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Filter requests that overlap with current month
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const relevantRequests = calendarRentalRequests.filter(req => {
        if (!req.startDate || !req.endDate) return false;
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        return (start <= monthEnd && end >= monthStart);
    });

    // Build HTML
    let html = '<div class="calendar-tableau-wrapper">';
    
    // Header row with dates
    html += '<div class="calendar-row calendar-header-row">';
    html += '<div class="calendar-car-header">Car</div>';
    html += '<div class="calendar-dates-header">';
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
        html += `<div class="calendar-date-header ${dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : ''}">`;
        html += `<span class="date-number">${day}</span>`;
        html += `<span class="date-name">${dayName}</span>`;
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';

            // Rows for each car
            if (calendarCars.length === 0) {
                html += '<div class="calendar-empty">No rental cars available</div>';
            } else {
                calendarCars.forEach(car => {
                    const carName = [
                        car.year,
                        car.brand || car.make,
                        car.model
                    ].filter(Boolean).join(' ') || 'Unknown Car';

                    // Get requests for this car
                    const carRequests = relevantRequests.filter(req => {
                        const reqCarId = typeof req.carId === 'object' ? req.carId._id || req.carId : req.carId;
                        const carId = typeof car._id === 'string' ? car._id : car._id.toString();
                        return reqCarId === carId || reqCarId?.toString() === carId;
                    });

                    // Sort requests by start date for consistent ordering
                    const sortedCarRequests = [...carRequests].sort((a, b) => {
                        const dateA = new Date(a.startDate);
                        const dateB = new Date(b.startDate);
                        return dateA - dateB;
                    });

                    // Filter visible requests (those that overlap with current month) and calculate row assignments
                    const monthStartDate = new Date(year, month, 1);
                    const monthEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
                    
                    const visibleRequestsForCar = [];
                    const carRowAssignments = [];
                    
                    sortedCarRequests.forEach((request) => {
                        const startDate = new Date(request.startDate);
                        const endDate = new Date(request.endDate);
                        // Normalize dates to midnight for accurate comparison
                        const reqStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                        const reqEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                        reqEnd.setHours(23, 59, 59, 999);
                        
                        // Check if this request overlaps with the current month
                        if (reqEnd >= monthStartDate && reqStart <= monthEndDate) {
                            // Find which row this booking should be on (for overlapping bookings)
                            const conflictingRows = new Set();
                            
                            // Check against all previously added visible requests
                            for (let i = 0; i < visibleRequestsForCar.length; i++) {
                                const other = visibleRequestsForCar[i];
                                
                                // Check if this request overlaps with the other request
                                // Two date ranges overlap if: start1 <= end2 AND start2 <= end1
                                if (reqStart <= other.reqEnd && other.reqStart <= reqEnd) {
                                    // They overlap - mark that row as conflicting
                                    conflictingRows.add(carRowAssignments[i]);
                                }
                            }
                            
                            // Find the first available row that doesn't conflict
                            let rowIndex = 0;
                            while (conflictingRows.has(rowIndex)) {
                                rowIndex++;
                            }
                            
                            // Add to visible requests and assign row
                            visibleRequestsForCar.push({
                                request,
                                reqStart,
                                reqEnd
                            });
                            carRowAssignments.push(rowIndex);
                        }
                    });

                    // Calculate max rows needed for this car based on visible requests
                    const maxRowsForCar = carRowAssignments.length > 0 ? Math.max(...carRowAssignments) + 1 : 1;
                    const barHeight = 28;
                    const barSpacing = 6;
                    const containerMinHeight = Math.max(50, (maxRowsForCar * barHeight) + ((maxRowsForCar - 1) * barSpacing) + 12);
                    
                    // Create main row with booking bars
                    html += '<div class="calendar-row calendar-car-row">';
                    html += `<div class="calendar-car-name">${escapeHtml(carName)}</div>`;
                    html += `<div class="calendar-dates-row calendar-booking-container" data-car-id="${car._id}" style="min-height: ${containerMinHeight}px;">`;

                    // Create base cells for grid layout
                    for (let day = 1; day <= daysInMonth; day++) {
                        const currentDate = new Date(year, month, day);
                        const dayOfWeek = currentDate.getDay();
                        let cellClass = 'calendar-date-cell';
                        if (dayOfWeek === 0 || dayOfWeek === 6) cellClass += ' weekend';
                        html += `<div class="${cellClass}"></div>`;
                    }

                    // Add booking bars as overlays inside the container
                    // Use pre-calculated visibleRequestsForCar and carRowAssignments
                    if (visibleRequestsForCar.length > 0) {
                        const barHeight = 28;
                        const barSpacing = 6;
                        
                        // Calculate max rows for centering using pre-calculated assignments
                        const maxRows = carRowAssignments.length > 0 ? Math.max(...carRowAssignments) + 1 : 1;
                        const totalBarSpace = barHeight + barSpacing;
                        const totalHeight = (maxRows * barHeight) + ((maxRows - 1) * barSpacing);
                        // Calculate base offset to center all bars vertically in the container
                        // Center is at 50% of container height, so we start from -(totalHeight/2) + (barHeight/2)
                        const baseOffsetPx = -totalHeight / 2 + barHeight / 2;
                        
                        // Render booking bars with proper centering and row assignments
                        visibleRequestsForCar.forEach((item, idx) => {
                            const { request, reqStart, reqEnd } = item;
                            const rowIndex = carRowAssignments[idx] || 0;
                            
                            // Calculate start and end positions
                            let startDay = Math.max(1, reqStart >= monthStartDate ? reqStart.getDate() : 1);
                            let endDay = Math.min(daysInMonth, reqEnd <= monthEndDate ? reqEnd.getDate() : daysInMonth);
                            
                            // Adjust for partial month visibility
                            if (reqStart < monthStartDate) {
                                startDay = 1;
                            }
                            if (reqEnd > monthEndDate) {
                                endDay = daysInMonth;
                            }
                            
                            // Calculate vertical offset for stacking (centered relative to container)
                            // Use calc(50% + offset) to center from the middle of the container
                            const rowOffsetPx = rowIndex * totalBarSpace;
                            const topOffsetPx = baseOffsetPx + rowOffsetPx;
                            
                            // Calculate left position and width
                            const cellWidth = 100 / daysInMonth; // percentage
                            const leftPercent = ((startDay - 1) * cellWidth);
                            const widthPercent = ((endDay - startDay + 1) * cellWidth);
                            
                            // Adjust for half-cell at start and end if fully visible
                            let leftAdjust = 0;
                            let widthAdjust = 0;
                            
                            if (reqStart >= monthStartDate && reqStart.getMonth() === month && reqStart.getFullYear() === year) {
                                leftAdjust = cellWidth * 0.5; // Start from middle of start day
                                widthAdjust -= cellWidth * 0.5;
                            }
                            
                            if (reqEnd <= monthEndDate && reqEnd.getMonth() === month && reqEnd.getFullYear() === year) {
                                widthAdjust -= cellWidth * 0.5; // End at middle of end day
                            }
                            
                            const finalLeft = leftPercent + leftAdjust;
                            const finalWidth = widthPercent + widthAdjust;
                            
                            const startDate = new Date(request.startDate);
                            const endDate = new Date(request.endDate);
                            // Normalize status to ensure proper color mapping
                            const rawStatus = request.status || 'new';
                            const normalizedStatus = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'].includes(rawStatus)
                                ? rawStatus
                                : (rawStatus === 'pending' ? 'new' : rawStatus === 'completed' ? 'closed' : 'new');
                            const statusClass = normalizedStatus;
                            const clientName = escapeHtml(request.clientName);
                            const startDateStr = startDate.toLocaleDateString();
                            const endDateStr = endDate.toLocaleDateString();
                            const requestId = request._id || request.id;
                            
                            html += `<div class="booking-bar status-${statusClass}" 
                                style="left: ${finalLeft}%; width: ${finalWidth}%; top: calc(50% + ${topOffsetPx}px); transform: translateY(-50%);" 
                                data-request-id="${requestId}"
                                data-request-type="rent"
                                title="${clientName} - ${startDateStr} to ${endDateStr} (${formatRequestStatusLabel(statusClass)})">
                                <span class="booking-bar-label">${clientName}</span>
                            </div>`;
                        });
                        
                        // Update container min-height if we have overlapping bookings
                        if (maxRows > 1) {
                            // Find the container we just created and update its height
                            // We'll do this after rendering by updating the style
                        }
                    }
                    
                    html += '</div>';
                    html += '</div>';
                });
            }

        html += '</div>';
        tableauContainer.innerHTML = html;
        
        // Update container heights for cars with overlapping bookings
        calendarCars.forEach(car => {
            const container = tableauContainer.querySelector(`[data-car-id="${car._id}"]`);
            if (container) {
                // Count how many bars are in this container
                const bars = container.querySelectorAll('.booking-bar');
                if (bars.length > 0) {
                    // Get all unique row positions (top values)
                    const rowPositions = Array.from(bars).map(bar => {
                        const style = bar.getAttribute('style') || '';
                        const topMatch = style.match(/top:\s*([-\d.]+)px/);
                        return topMatch ? parseFloat(topMatch[1]) : 0;
                    });
                    
                    // Calculate unique rows
                    const uniqueRows = new Set();
                    rowPositions.forEach(pos => {
                        // Round to nearest row position
                        const barHeight = 28;
                        const barSpacing = 6;
                        const totalBarSpace = barHeight + barSpacing;
                        const row = Math.round((pos + (totalBarSpace * 10)) / totalBarSpace);
                        uniqueRows.add(row);
                    });
                    
                    const maxRows = Math.max(uniqueRows.size || 1, 1);
                    const neededHeight = Math.max(50, (maxRows * 28) + ((maxRows - 1) * 6) + 12);
                    container.style.minHeight = `${neededHeight}px`;
                }
            }
        });
        
        // Add click handlers to booking bars
        tableauContainer.querySelectorAll('.booking-bar').forEach(bar => {
            bar.addEventListener('click', (e) => {
                const requestId = bar.getAttribute('data-request-id');
                const requestType = bar.getAttribute('data-request-type') || 'rent';
                if (requestId) {
                    showRequestDetails(requestId, requestType);
                }
            });
        });
    } catch (error) {
        console.error('Error rendering calendar tableau:', error);
        console.error('Error stack:', error.stack);
        tableauContainer.innerHTML = `<div class="calendar-error">Error rendering calendar: ${error.message || 'Unknown error'}</div>`;
    }
}

// Show request details modal
async function showRequestDetails(requestId, requestType = 'rent') {
    if (!authToken) {
        alert('You need to be logged in to view request details.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load request details');
        }

        const request = await response.json();
        const car = request.carId || {};
        const carNameParts = [
            car.year,
            car.brand || car.make,
            car.model
        ].filter(Boolean);
        const carName = carNameParts.length ? carNameParts.join(' ') : 'Vehicle removed';
        const submittedAt = request.createdAt ? new Date(request.createdAt).toLocaleString() : '—';
        const rentalDates = requestType === 'rent' && request.startDate && request.endDate
            ? `${new Date(request.startDate).toLocaleDateString()} → ${new Date(request.endDate).toLocaleDateString()}`
            : null;

        const normalizedStatus = ['new', 'contacted', 'ongoing', 'accepted', 'rejected', 'closed'].includes(request.status)
            ? request.status
            : (request.status === 'pending' ? 'new' : request.status === 'completed' ? 'closed' : 'new');
        const statusLabel = formatRequestStatusLabel(normalizedStatus);
        const statusOptions = REQUEST_STATUS_OPTIONS.map(option => `
            <option value="${option.value}" ${option.value === normalizedStatus ? 'selected' : ''}>
                ${option.label}
            </option>
        `).join('');

        const messageHtml = request.message
            ? `<div class="request-message">${escapeHtml(request.message).replace(/\n/g, '<br>')}</div>`
            : '';

        // Calculate price for rental or sale requests
        let basePrice = null;
        let totalPrice = null;
        let rentalDays = 0;
        
        if (requestType === 'rent' && request.startDate && request.endDate) {
            const start = new Date(request.startDate);
            const end = new Date(request.endDate);
            rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Include both start and end day
            
            // Use custom price if set, otherwise calculate from daily rate
            if (request.customPrice !== null && request.customPrice !== undefined) {
                basePrice = request.customPrice;
            } else if (car.dailyRate) {
                basePrice = car.dailyRate * rentalDays;
            }
            
            // Apply discount if set
            if (basePrice !== null) {
                const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                totalPrice = basePrice - discountAmount;
            }
        } else if (requestType === 'sale') {
            // For sale requests, use custom price if set, otherwise use car price
            if (request.customPrice !== null && request.customPrice !== undefined) {
                basePrice = request.customPrice;
            } else if (car.price) {
                basePrice = car.price;
            }
            
            // Apply discount if set
            if (basePrice !== null) {
                const discountAmount = basePrice * ((request.discountPercent || 0) / 100);
                totalPrice = basePrice - discountAmount;
            }
        }

        const priceHtml = totalPrice !== null
            ? `<div class="request-price-section">
                <div class="request-price-header">
                    <h3 class="request-section-title">${requestType === 'rent' ? 'Rental' : 'Sale'} Price Breakdown</h3>
                    <p class="price-section-description">Adjust the ${requestType === 'rent' ? 'rental' : 'sale'} price or apply a discount as needed.</p>
                </div>
                
                <!-- Price Calculation Display -->
                <div class="price-calculation-flow">
                    ${requestType === 'rent' ? `
                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">1</span>
                            <span>Daily Rate</span>
                        </div>
                        <div class="price-step-value" data-price-daily-rate="${request._id}" data-value="${car.dailyRate || 0}">${formatCurrency(car.dailyRate || 0)}<span class="price-unit">/day</span></div>
                    </div>
                    
                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">2</span>
                            <span>Rental Period</span>
                        </div>
                        <div class="price-step-value" data-price-days="${request._id}" data-value="${rentalDays}">${rentalDays} <span class="price-unit">days</span></div>
                    </div>
                    
                    <div class="price-calculation-arrow">×</div>
                    ` : `
                    <div class="price-calculation-step">
                        <div class="price-step-label">
                            <span class="price-step-icon">1</span>
                            <span>Asking Price</span>
                        </div>
                        <div class="price-step-value" data-price-asking="${request._id}" data-value="${car.price || 0}">${formatCurrency(car.price || 0)}</div>
                    </div>
                    `}
                    
                    <div class="price-calculation-step price-step-base">
                        <div class="price-step-label">
                            <span class="price-step-icon">${requestType === 'rent' ? '3' : '2'}</span>
                            <span>Base Price</span>
                        </div>
                        <div class="price-step-value" data-price-base="${request._id}">${formatCurrency(basePrice)}</div>
                        ${request.customPrice !== null && request.customPrice !== undefined 
                            ? `<div class="price-step-note">(Custom price set)</div>`
                            : requestType === 'rent' 
                                ? `<div class="price-step-note">(${formatCurrency(car.dailyRate || 0)} × ${rentalDays} days)</div>`
                                : `<div class="price-step-note">(Original asking price)</div>`
                        }
                    </div>
                    
                    ${request.discountPercent && request.discountPercent > 0 ? `
                    <div class="price-calculation-arrow">−</div>
                    <div class="price-calculation-step price-step-discount" id="discount-step-${request._id}">
                        <div class="price-step-label">
                            <span class="price-step-icon">4</span>
                            <span>Discount (${request.discountPercent}%)</span>
                        </div>
                        <div class="price-step-value discount-amount" data-price-discount="${request._id}">-${formatCurrency(basePrice * (request.discountPercent / 100))}</div>
                    </div>
                    ` : `<div class="price-calculation-arrow" id="discount-arrow-${request._id}" style="display: none;">−</div>
                    <div class="price-calculation-step price-step-discount" id="discount-step-${request._id}" style="display: none;">
                        <div class="price-step-label">
                            <span class="price-step-icon">4</span>
                            <span>Discount (<span id="discount-percent-label-${request._id}">0</span>%)</span>
                        </div>
                        <div class="price-step-value discount-amount" data-price-discount="${request._id}">-$0.00</div>
                    </div>`}
                    
                    <div class="price-calculation-arrow price-arrow-final">=</div>
                    
                    <div class="price-calculation-step price-step-total">
                        <div class="price-step-label">
                            <span class="price-step-icon">✓</span>
                            <span>Total Amount</span>
                        </div>
                        <div class="price-step-value price-total-large" data-price-total="${request._id}">${formatCurrency(totalPrice)}</div>
                    </div>
                </div>
                
                <!-- Price Adjustment Controls -->
                <div class="price-adjustment-section">
                    <h4 class="price-adjustment-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Price Adjustments
                    </h4>
                    <div class="price-adjustment-controls">
                        <div class="price-input-group">
                            <label for="customPrice-${request._id}">
                                <span>Override Total Price</span>
                                <small>Leave empty to use calculated price</small>
                            </label>
                            <div class="price-input-wrapper">
                                <span class="price-input-prefix">$</span>
                                <input 
                                    type="number" 
                                    id="customPrice-${request._id}" 
                                    class="price-input" 
                                    placeholder="Auto-calculated"
                                    value="${request.customPrice !== null && request.customPrice !== undefined ? request.customPrice : ''}"
                                    step="0.01"
                                    min="0"
                                    onchange="updateRequestPrice('${request._id}', this.value, document.getElementById('discountPercent-${request._id}').value)"
                                >
                                ${request.customPrice !== null && request.customPrice !== undefined 
                                    ? `<button class="btn-clear-price" onclick="clearCustomPrice('${request._id}')" title="Reset to calculated price">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>`
                                    : ''
                                }
                            </div>
                        </div>
                        <div class="price-input-group">
                            <label for="discountPercent-${request._id}">
                                <span>Apply Discount</span>
                                <small>Percentage discount (0-100%)</small>
                            </label>
                            <div class="price-input-wrapper">
                                <input 
                                    type="number" 
                                    id="discountPercent-${request._id}" 
                                    class="price-input" 
                                    placeholder="0"
                                    value="${request.discountPercent || 0}"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    onchange="updateRequestPrice('${request._id}', document.getElementById('customPrice-${request._id}').value, this.value)"
                                >
                                <span class="price-input-suffix">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`
            : '';

        // Photos display
        const photos = request.photos || [];
        const photosHtml = photos.length > 0
            ? `<div class="request-photos-section">
                <h4 class="request-section-title">Damage Photos</h4>
                <div class="request-photos-grid" id="requestPhotosGrid-${request._id}">
                    ${photos.map((photo, idx) => `
                        <div class="request-photo-item">
                            <img src="${photo}" alt="Damage photo ${idx + 1}" class="request-photo" onerror="this.style.display='none'">
                            <button class="request-photo-delete" onclick="deleteRequestPhoto('${request._id}', '${idx}')" title="Delete photo">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>`
            : '';

        const modalHtml = `
            <div class="request-detail-modal">
                <div class="request-detail-content">
                    <span class="close-request-modal">&times;</span>
                    <div class="request-card">
                        <div class="request-card-header">
                            <div class="request-card-title">
                                <span class="request-car-name">${escapeHtml(carName)}</span>
                                <span class="request-type-badge ${requestType}">${requestType === 'rent' ? 'Rental request' : 'Sale request'}</span>
                            </div>
                            <span class="request-status-badge ${normalizedStatus}">${escapeHtml(statusLabel)}</span>
                        </div>
                        <div class="request-meta-grid">
                            <div class="request-meta-item">
                                <span class="request-meta-label">Client</span>
                                <span class="request-meta-value">${escapeHtml(request.clientName)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Email</span>
                                <span class="request-meta-value">${escapeHtml(request.clientEmail)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Phone</span>
                                <span class="request-meta-value">${escapeHtml(request.clientPhone)}</span>
                            </div>
                            <div class="request-meta-item">
                                <span class="request-meta-label">Submitted</span>
                                <span class="request-meta-value">${escapeHtml(submittedAt)}</span>
                            </div>
                            ${rentalDates ? `
                                <div class="request-meta-item">
                                    <span class="request-meta-label">Rental window</span>
                                    <span class="request-meta-value">${escapeHtml(rentalDates)}</span>
                                </div>` : ''}
                            ${requestType === 'rent' && request.fuelLevel ? `
                                <div class="request-meta-item">
                                    <span class="request-meta-label">Fuel Level (at start)</span>
                                    <span class="request-meta-value">${escapeHtml(request.fuelLevel)}</span>
                                </div>` : ''}
                        </div>
                        ${messageHtml}
                        ${priceHtml}
                        
                        ${requestType === 'rent' ? `
                        <!-- Fuel Level Section -->
                        <div class="request-fuel-section">
                            <label class="request-section-title" for="fuelLevel-${request._id}">Fuel Level at Rental Start</label>
                            <select 
                                id="fuelLevel-${request._id}" 
                                class="request-fuel-select" 
                                onchange="updateFuelLevel('${request._id}', this.value)"
                            >
                                <option value="" ${!request.fuelLevel ? 'selected' : ''}>Not recorded</option>
                                <option value="Empty" ${request.fuelLevel === 'Empty' ? 'selected' : ''}>Empty</option>
                                <option value="1/4" ${request.fuelLevel === '1/4' ? 'selected' : ''}>1/4 Full</option>
                                <option value="1/2" ${request.fuelLevel === '1/2' ? 'selected' : ''}>1/2 Full</option>
                                <option value="3/4" ${request.fuelLevel === '3/4' ? 'selected' : ''}>3/4 Full</option>
                                <option value="Full" ${request.fuelLevel === 'Full' ? 'selected' : ''}>Full</option>
                            </select>
                        </div>
                        ` : ''}
                        
                        <!-- Notes Section -->
                        <div class="request-notes-section">
                            <label class="request-section-title" for="requestNotes-${request._id}">Notes</label>
                            <textarea 
                                id="requestNotes-${request._id}" 
                                class="request-notes-textarea" 
                                placeholder="Add notes about this rental request..."
                                onblur="saveRequestNotes('${request._id}', this.value)"
                            >${escapeHtml(request.notes || '')}</textarea>
                        </div>

                        <!-- Photos Section -->
                        <div class="request-photos-upload-section">
                            <div class="request-photos-header">
                                <h4 class="request-section-title">Damage Photos</h4>
                                <label for="requestPhotoUpload-${request._id}" class="btn-camera" title="Take or upload photos">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                    Add Photos
                                </label>
                                <input 
                                    type="file" 
                                    id="requestPhotoUpload-${request._id}" 
                                    class="request-photo-upload-input" 
                                    accept="image/*" 
                                    capture="environment"
                                    multiple
                                    style="display: none;"
                                    onchange="uploadRequestPhotos('${request._id}', this.files)"
                                >
                            </div>
                            ${photosHtml}
                        </div>

                        <div class="request-actions">
                            <label for="status-${request._id}">Update status</label>
                            <select id="status-${request._id}" class="request-status-select" onchange="updateRequestStatus('${request._id}', this.value)">
                                ${statusOptions}
                            </select>
                            ${normalizedStatus === 'accepted' ? `
                                <button class="btn-primary btn-print-contract" onclick="printContract('${request._id}', '${requestType}')" title="Print/Download Contract">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                        <rect x="6" y="14" width="12" height="8"></rect>
                                    </svg>
                                    Print Contract
                                </button>
                            ` : ''}
                            <button class="btn-delete" onclick="deleteRequest('${request._id}', '${requestType}')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('requestDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create and show modal
        const modal = document.createElement('div');
        modal.id = 'requestDetailModal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        // Close handlers
        const closeBtn = modal.querySelector('.close-request-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Show modal
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    } catch (error) {
        console.error('Error loading request details:', error);
        alert('Error loading request details. Please try again.');
    }
}

// Upload photos for a rental request
async function uploadRequestPhotos(requestId, files) {
    if (!files || files.length === 0) return;
    
    if (!authToken) {
        alert('You need to be logged in to upload photos.');
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
    }

    try {
        const response = await fetch(`${API_BASE}/upload/rental-photos/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            const data = await response.json();
            
            // Add photos to the request in the database
            const updateResponse = await fetch(`${API_BASE}/admin/requests/${requestId}/photos`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ photos: data.urls })
            });

            if (updateResponse.ok) {
                // Reload request details to show new photos
                const requestType = 'rent'; // Photos are only for rental requests
                showRequestDetails(requestId, requestType);
            } else {
                alert('Photos uploaded but failed to save to request. Please refresh.');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error uploading photos');
        }
    } catch (error) {
        console.error('Error uploading photos:', error);
        alert('Error uploading photos');
    }
}

// Delete a photo from a rental request
async function deleteRequestPhoto(requestId, photoIndex) {
    if (!authToken) {
        alert('You need to be logged in to delete photos.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/photos/${photoIndex}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            // Reload request details
            showRequestDetails(requestId, 'rent');
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error deleting photo');
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Error deleting photo');
    }
}

// Save notes for a rental request
async function saveRequestNotes(requestId, notes) {
    if (!authToken) {
        return; // Silently fail if not logged in
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/notes`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ notes })
        });

        if (!response.ok) {
            console.error('Failed to save notes');
        }
    } catch (error) {
        console.error('Error saving notes:', error);
    }
}

// Update rental price/discount
async function updateRequestPrice(requestId, customPrice, discountPercent) {
    if (!authToken) {
        return; // Silently fail if not logged in
    }

    try {
        const priceValue = customPrice === '' || customPrice === null || customPrice === undefined 
            ? null 
            : parseFloat(customPrice);
        const discountValue = discountPercent === '' || discountPercent === null || discountPercent === undefined
            ? 0
            : parseFloat(discountPercent);

        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/price`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                customPrice: priceValue,
                discountPercent: discountValue
            })
        });

        if (response.ok) {
            // Update the display immediately without reloading the entire modal
            updatePriceDisplay(requestId, priceValue, discountValue);
            
            // Reload the request list to show updated price
            const requestType = document.querySelector('.request-type-badge.rent') ? 'rent' : 'sale';
            if (requestType) {
                loadClientRequests(requestType);
            }
            
            // Also reload request details to ensure everything is in sync
            // This ensures the contract will have the latest price when printed
            setTimeout(() => {
                showRequestDetails(requestId, requestType || 'rent');
            }, 100);
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error updating price');
        }
    } catch (error) {
        console.error('Error updating price:', error);
        alert('Error updating price. Please try again.');
    }
}

// Update price display immediately (before server response)
function updatePriceDisplay(requestId, customPrice, discountPercent) {
    // Get current values from the DOM
    const dailyRateEl = document.querySelector(`[data-price-daily-rate="${requestId}"]`);
    const daysEl = document.querySelector(`[data-price-days="${requestId}"]`);
    const askingPriceEl = document.querySelector(`[data-price-asking="${requestId}"]`);
    const basePriceEl = document.querySelector(`[data-price-base="${requestId}"]`);
    const discountEl = document.querySelector(`[data-price-discount="${requestId}"]`);
    const totalPriceEl = document.querySelector(`[data-price-total="${requestId}"]`);
    
    // Calculate base price - handle both rental and sale
    let basePrice;
    if (dailyRateEl && daysEl) {
        // Rental request
        const dailyRate = parseFloat(dailyRateEl.dataset.value || 0);
        const days = parseInt(daysEl.dataset.value || 0);
        basePrice = customPrice !== null && customPrice !== undefined ? customPrice : (dailyRate * days);
    } else if (askingPriceEl) {
        // Sale request
        const askingPrice = parseFloat(askingPriceEl.dataset.value || 0);
        basePrice = customPrice !== null && customPrice !== undefined ? customPrice : askingPrice;
    } else {
        return; // Can't update without price data
    }
    
    // Calculate discount
    const discount = parseFloat(discountPercent || 0);
    const discountAmount = basePrice * (discount / 100);
    const totalPrice = basePrice - discountAmount;
    
    // Update base price display
    if (basePriceEl) {
        basePriceEl.textContent = formatCurrency(basePrice);
        const noteEl = basePriceEl.parentElement.querySelector('.price-step-note');
        if (noteEl) {
            if (customPrice !== null && customPrice !== undefined) {
                noteEl.textContent = '(Custom price set)';
            } else if (dailyRateEl && daysEl) {
                const dailyRate = parseFloat(dailyRateEl.dataset.value || 0);
                const days = parseInt(daysEl.dataset.value || 0);
                noteEl.textContent = `(${formatCurrency(dailyRate)} × ${days} days)`;
            } else {
                noteEl.textContent = '(Original asking price)';
            }
        }
    }
    
    // Update discount display
    const discountStep = document.getElementById(`discount-step-${requestId}`);
    const discountArrow = document.getElementById(`discount-arrow-${requestId}`);
    
    if (discount > 0) {
        if (discountStep) {
            discountStep.style.display = 'flex';
            if (discountEl) {
                discountEl.textContent = `-${formatCurrency(discountAmount)}`;
            }
            const discountLabel = discountStep.querySelector('.price-step-label');
            const discountPercentLabel = document.getElementById(`discount-percent-label-${requestId}`);
            if (discountLabel) {
                discountLabel.innerHTML = `<span class="price-step-icon">4</span><span>Discount (${discount}%)</span>`;
            }
            if (discountPercentLabel) {
                discountPercentLabel.textContent = discount;
            }
        }
        if (discountArrow) {
            discountArrow.style.display = 'flex';
        }
    } else {
        if (discountStep) {
            discountStep.style.display = 'none';
        }
        if (discountArrow) {
            discountArrow.style.display = 'none';
        }
    }
    
    // Update total price display
    if (totalPriceEl) {
        totalPriceEl.textContent = formatCurrency(totalPrice);
    }
}

// Clear custom price (reset to calculated price)
async function clearCustomPrice(requestId) {
    if (!authToken) {
        return;
    }

    const discountInput = document.getElementById(`discountPercent-${requestId}`);
    const discountValue = discountInput ? discountInput.value : 0;
    
    await updateRequestPrice(requestId, null, discountValue);
}

// Print/Download contract as PDF (rental or sale)
async function printContract(requestId, requestType = 'rent') {
    if (!authToken) {
        alert('You need to be logged in to print contracts.');
        return;
    }

    try {
        // Generate contract HTML (browser will handle PDF via print dialog)
        const endpoint = requestType === 'rent' 
            ? `${API_BASE}/admin/requests/${requestId}/contract/pdf`
            : `${API_BASE}/admin/requests/${requestId}/sales-contract/pdf`;
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (await handleApiResponse(response) === false) {
            return;
        }

        if (response.ok) {
            // Get HTML content
            const htmlContent = await response.text();
            
            // Create a new window with the contract HTML
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                // If popup blocked, show a message
                alert('Please allow popups to view the contract, or use the download option.');
                // Alternative: download as HTML file
                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rental-contract-${requestId}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                return;
            }
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load, then open print dialog
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                    // Optional: close window after printing
                    // printWindow.close();
                }, 250);
            };
        } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Error response:', errorText);
            alert('Error generating contract. Please try again.');
        }
    } catch (error) {
        console.error('Error generating contract:', error);
        alert('Error generating contract. Please check your connection and try again.');
    }
}

// Update fuel level for a rental request
async function updateFuelLevel(requestId, fuelLevel) {
    if (!authToken) {
        return; // Silently fail if not logged in
    }

    try {
        const response = await fetch(`${API_BASE}/admin/requests/${requestId}/fuel-level`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ fuelLevel })
        });

        if (response.ok) {
            // Reload request details to show updated fuel level
            const requestType = document.querySelector('.request-type-badge.rent') ? 'rent' : 'sale';
            setTimeout(() => {
                showRequestDetails(requestId, requestType || 'rent');
            }, 100);
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Error updating fuel level');
        }
    } catch (error) {
        console.error('Error updating fuel level:', error);
        alert('Error updating fuel level. Please try again.');
    }
}

// Print/Download rental contract (backwards compatibility)
async function printRentalContract(requestId) {
    return printContract(requestId, 'rent');
}

// Make functions globally accessible
window.uploadRequestPhotos = uploadRequestPhotos;
window.deleteRequestPhoto = deleteRequestPhoto;
window.saveRequestNotes = saveRequestNotes;
window.printContract = printContract;
window.printRentalContract = printRentalContract;
window.updateRequestPrice = updateRequestPrice;
window.clearCustomPrice = clearCustomPrice;
window.updateFuelLevel = updateFuelLevel;

//# sourceMappingURL=app.js.map
//# sourceMappingURL=app.js.map