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

    // Hamburger/X menu toggle
    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

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
        } else if (pageId === 'admin-dashboard' && authToken) {
            loadAdminDashboard();
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
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const newImage = thumb.getAttribute('data-image');
                if (mainImage && newImage) {
                    mainImage.src = newImage;
                }
                thumbnails.forEach(btn => btn.classList.remove('active'));
                thumb.classList.add('active');
            });
        });

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
                    } else if (section === 'client-requests') {
                        loadClientRequests();
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

function populateSiteSettingsForm(settings) {
    document.getElementById('siteTitle').value = settings.siteTitle || '';
    document.getElementById('logoText').value = settings.logoText || '';
    document.getElementById('phoneNumber').value = settings.phoneNumber || '';
    document.getElementById('emailAddress').value = settings.emailAddress || '';
    document.getElementById('adminEmail').value = settings.adminEmail || '';
    document.getElementById('address').value = settings.address || '';
    document.getElementById('googleAnalyticsId').value = settings.googleAnalyticsId || '';
    document.getElementById('logoUrl').value = settings.logoUrl || '';
    document.getElementById('backgroundImageUrl').value = settings.backgroundImageUrl || '';

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
}

async function handleSiteSettingsSubmit(e) {
    e.preventDefault();
    hideSiteSettingsMessages();
 
    const settingsData = {
        siteTitle: document.getElementById('siteTitle').value,
        logoText: document.getElementById('logoText').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        emailAddress: document.getElementById('emailAddress').value,
        adminEmail: document.getElementById('adminEmail').value,
        address: document.getElementById('address').value,
        googleAnalyticsId: document.getElementById('googleAnalyticsId').value.trim(),
        logoUrl: document.getElementById('logoUrl').value,
        backgroundImageUrl: document.getElementById('backgroundImageUrl').value,
        menuBackgroundColor: document.getElementById('menuBackgroundColorText').value || document.getElementById('menuBackgroundColor').value,
        menuTextColor: document.getElementById('menuTextColor').value,
        menuAccentColor: document.getElementById('menuAccentColor').value,
        containerBackgroundColor: document.getElementById('containerBackgroundColorText').value || document.getElementById('containerBackgroundColor').value,
        containerBorderColor: document.getElementById('containerBorderColorText').value || document.getElementById('containerBorderColor').value,
        containerTextColor: document.getElementById('containerTextColor').value
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

    updateFooterUserInfo();
}

function resetSiteSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
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
        document.getElementById('address').value = '123 MAIN STREET, SARASOTA, FL 34236';
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

// Update footer to show user info when logged in
function updateFooterUserInfo() {
    const footerAdminLink = document.querySelector('.footer-admin-link');
    if (!footerAdminLink) return;

    const phoneSourceEl = document.querySelector('[data-contact-phone-value]');
    const addressSourceEl = document.querySelector('[data-contact-address-value]');
    const phoneText = phoneSourceEl ? phoneSourceEl.textContent.trim() : '';
    const addressText = addressSourceEl ? addressSourceEl.textContent.trim() : '';

    const phoneHref = phoneText ? buildTelHref(phoneText) : '';
    const addressHref = addressText ? buildDirectionsUrl(addressText) : '';

    const contactMarkup = `
        <div class="footer-contact-block">
            ${phoneText ? `
                <a class="footer-contact-link" data-contact-phone-link href="${phoneHref || '#'}" aria-label="Call us at ${escapeHtml(phoneText)}">
                    <span class="footer-contact-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.25 6.75c0 8.284 6.716 15 15 15H19.5a1.5 1.5 0 0 0 1.5-1.5v-2.615a1.5 1.5 0 0 0-1.17-1.47l-3.183-.796a1.5 1.5 0 0 0-1.64.684l-.7 1.167a12.003 12.003 0 0 1-5.516-5.516l1.167-.7a1.5 1.5 0 0 0 .684-1.64L9.835 3.87A1.5 1.5 0 0 0 8.365 2.7H5.75A1.5 1.5 0 0 0 4.25 4.2v2.55z"></path>
                        </svg>
                    </span>
                    <span class="footer-contact-text">
                        <span class="footer-contact-label">Call us</span>
                        <span class="footer-contact-value" data-contact-phone-value>${escapeHtml(phoneText)}</span>
                    </span>
                </a>
            ` : ''}
            ${addressText ? `
                <a class="footer-contact-link footer-contact-address" data-contact-address-link href="${addressHref || '#'}" target="_blank" rel="noopener" aria-label="Get directions to ${escapeHtml(addressText)}">
                    <span class="footer-contact-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path>
                            <path d="M19.5 10.5c0 7-7.5 11.25-7.5 11.25S4.5 17.5 4.5 10.5a7.5 7.5 0 1 1 15 0z"></path>
                        </svg>
                    </span>
                    <span class="footer-contact-text">
                        <span class="footer-contact-label">Visit us</span>
                        <span class="footer-contact-value" data-contact-address-value>${escapeHtml(addressText)}</span>
                    </span>
                </a>
            ` : ''}
        </div>
    `;

    if (authToken && currentUser) {
        footerAdminLink.innerHTML = `
            ${contactMarkup}
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
            ${contactMarkup}
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
            const updates = [
                { el: statElements.totalSale, value: stats.carsForSale?.total ?? 0 },
                { el: statElements.availableSale, value: stats.carsForSale?.available ?? 0 },
                { el: statElements.sold, value: stats.carsForSale?.sold ?? 0 },
                { el: statElements.rent, value: stats.rentCars?.total ?? 0 },
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

        const normalizedStatus = ['new', 'contacted', 'ongoing', 'closed'].includes(request.status)
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
                </div>
                ${messageHtml}
                <div class="request-actions">
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

async function deleteRequest(requestId, type) {
    if (!authToken) {
        alert('You need to be logged in as admin to delete requests.');
        return;
    }

    const confirmed = confirm('Delete this request? This action cannot be undone.');
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
    const existingImgs = preview.querySelectorAll('img[data-existing="true"]');
    existingImgs.forEach(img => img.remove());
    
    imageUrls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.setAttribute('data-existing', 'true');
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        preview.appendChild(img);
    });
}

// Handle image file selection for sale cars
document.getElementById('carImages')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreview');
    if (preview) {
        // Don't clear existing images, just add new ones
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.setAttribute('data-new', 'true');
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                preview.appendChild(img);
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
        // Don't clear existing images, just add new ones
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.setAttribute('data-new', 'true');
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                preview.appendChild(img);
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
    
    // Upload images first if any are selected
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
    
    const carData = {
        brand: brand,
        model: model,
        type: type,
        status: 'available', // Ensure status is set
        description: document.getElementById('carDescription').value || ''
    };

    // Add uploaded images to car data
    if (uploadedImageUrls.length > 0) {
        // If editing, merge with existing images, otherwise use new images
        if (carId) {
            // Get existing images from preview (if any were displayed)
            const existingImages = [];
            const previewId = type === 'sale' ? 'imagePreview' : 'imagePreviewRent';
            const preview = document.getElementById(previewId);
            if (preview) {
                const existingImgs = preview.querySelectorAll('img[data-existing="true"]');
                existingImgs.forEach(img => {
                    if (img.src && !img.src.startsWith('data:')) {
                        existingImages.push(img.src);
                    }
                });
            }
            // Merge existing with new images
            carData.images = [...existingImages, ...uploadedImageUrls];
        } else {
            carData.images = uploadedImageUrls;
        }
    } else if (carId) {
        // If editing but no new images, preserve existing images
        const previewId = type === 'sale' ? 'imagePreview' : 'imagePreviewRent';
        const preview = document.getElementById(previewId);
        if (preview) {
            const existingImgs = preview.querySelectorAll('img[data-existing="true"]');
            const existingImages = [];
            existingImgs.forEach(img => {
                if (img.src && !img.src.startsWith('data:')) {
                    existingImages.push(img.src);
                }
            });
            if (existingImages.length > 0) {
                carData.images = existingImages;
            }
        }
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
    if (!confirm('Are you sure you want to delete this car?')) return;

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
}

//# sourceMappingURL=app.js.map