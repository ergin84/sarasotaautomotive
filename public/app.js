// API Base URL
const API_BASE = '/api';

// State
let authToken = localStorage.getItem('authToken');
let currentPage = 'home';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeModals();
    initializeAdmin();
    loadInitialPage();
});

function formatCarStatus(status) {
    if (status === 'sold') return 'SOLD OUT';
    if (status === 'coming_soon') return 'COMING SOON';
    return (status || '').toUpperCase();
}

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
            // Menu stays open - user must close it manually with X button
        });
    });

    // Admin link in footer
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            const page = adminLink.getAttribute('data-page');
            if (page === 'admin-dashboard' && !authToken) {
                showPage('admin-login');
            } else {
                showPage(page);
            }
            // Don't update active nav for admin link since it's in footer
        });
    }

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
        container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 40px;">No cars available at this time.</p>';
        return;
    }

    container.innerHTML = cars.map(car => {
        // Get the first image from images array or use legacy image field
        const carImage = (car.images && car.images.length > 0) 
            ? car.images[0] 
            : (car.image || 'https://via.placeholder.com/400x250?text=No+Image');
        
        // Get car name - use brand/model for new cars, make/model for legacy
        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        
        return `
        <div class="car-card" onclick="showCarDetails('${car._id}', '${type}')">
            <img src="${carImage}" 
                 alt="${carBrand} ${carModel}" 
                 class="car-image"
                 onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
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
        const car = await response.json();

        const modal = document.getElementById('carModal');
        const detailsDiv = document.getElementById('carDetails');
        const rentalForm = document.getElementById('rentalForm');

        const carBrand = car.brand || car.make || '';
        const carModel = car.model || '';
        const carYear = car.year || '';
        
        // Get all images
        const carImages = (car.images && car.images.length > 0) 
            ? car.images 
            : (car.image ? [car.image] : []);
        
        let imagesHTML = '';
        if (carImages.length > 0) {
            imagesHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin: 20px 0;">';
            carImages.forEach(imgUrl => {
                imagesHTML += `<img src="${imgUrl}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px;" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">`;
            });
            imagesHTML += '</div>';
        } else {
            imagesHTML = `<img src="https://via.placeholder.com/800x400?text=No+Image" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px; margin: 20px 0;">`;
        }
        
        detailsDiv.innerHTML = `
            <h2>${carYear ? carYear + ' ' : ''}${carBrand} ${carModel}</h2>
            ${imagesHTML}
            <p><strong>Price:</strong> ${type === 'rent' ? `$${car.dailyRate}/day` : `$${car.price ? car.price.toLocaleString() : 'N/A'}`}</p>
            ${car.mileage ? `<p><strong>Mileage:</strong> ${car.mileage.toLocaleString()} miles</p>` : ''}
            ${car.gearbox ? `<p><strong>Gearbox:</strong> ${car.gearbox}</p>` : ''}
            ${car.fuelType ? `<p><strong>Fuel Type:</strong> ${car.fuelType}</p>` : ''}
            ${car.power ? `<p><strong>Power:</strong> ${car.power} HP</p>` : ''}
            ${car.numPersons ? `<p><strong>Number of Persons:</strong> ${car.numPersons}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-${car.status}">${formatCarStatus(car.status)}</span></p>
            ${car.description ? `<p><strong>Description:</strong></p><p>${car.description}</p>` : ''}
        `;

        if (type === 'rent' && car.status === 'available') {
            rentalForm.style.display = 'block';
            document.getElementById('rentalCarId').value = carId;
        } else {
            rentalForm.style.display = 'none';
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading car details:', error);
        alert('Error loading car details');
    }
}

// Rental Inquiry Form
document.getElementById('rentalInquiryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        carId: document.getElementById('rentalCarId').value,
        clientName: document.getElementById('clientName').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientPhone: document.getElementById('clientPhone').value,
        message: document.getElementById('message').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };

    try {
        const response = await fetch(`${API_BASE}/rentals/inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Your rental inquiry has been submitted successfully! We will contact you soon.');
            document.getElementById('carModal').style.display = 'none';
            document.getElementById('rentalInquiryForm').reset();
        } else {
            alert('Error submitting inquiry. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting inquiry. Please try again.');
    }
});

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
            localStorage.setItem('authToken', authToken);
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
    // Admin navigation
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn') {
                logout();
                return;
            }

            const section = e.target.getAttribute('data-section');
            if (section) {
                document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
                
                const targetSection = document.getElementById(section);
                if (targetSection) {
                    targetSection.classList.add('active');
                    e.target.classList.add('active');

                    if (section === 'manage-sale') {
                        loadAdminCars('sale');
                    } else if (section === 'manage-rent') {
                        loadAdminCars('rent');
                    } else if (section === 'rental-requests') {
                        loadRentalRequests();
                    } else if (section === 'dashboard') {
                        loadDashboardStats();
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
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showPage('home');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('[data-page="home"]').classList.add('active');
}

async function loadAdminDashboard() {
    if (!authToken) {
        showPage('admin-login');
        return;
    }

    loadDashboardStats();
    loadAdminCars('sale');
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-total-sale').textContent = stats.carsForSale.total;
            document.getElementById('stat-available-sale').textContent = stats.carsForSale.available;
            document.getElementById('stat-sold').textContent = stats.carsForSale.sold;
            document.getElementById('stat-rent').textContent = stats.rentCars.total;
            document.getElementById('stat-pending').textContent = stats.rentalRequests.pending;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
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

async function loadRentalRequests() {
    try {
        const response = await fetch(`${API_BASE}/admin/rental-requests`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const requests = await response.json();
            displayRentalRequests(requests);
        }
    } catch (error) {
        console.error('Error loading rental requests:', error);
    }
}

function displayRentalRequests(requests) {
    const container = document.getElementById('rentalRequestsList');
    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = '<p style="color: #ccc;">No rental requests found.</p>';
        return;
    }

    container.innerHTML = requests.map(req => `
        <div class="rental-request-item">
            <h4>${req.carId ? `${req.carId.year} ${req.carId.make} ${req.carId.model}` : 'Car Deleted'}</h4>
            <p><strong>Client:</strong> ${req.clientName}</p>
            <p><strong>Email:</strong> ${req.clientEmail}</p>
            <p><strong>Phone:</strong> ${req.clientPhone}</p>
            <p><strong>Dates:</strong> ${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}</p>
            <p><strong>Message:</strong> ${req.message}</p>
            <p><strong>Status:</strong> <span class="status-${req.status}">${req.status.toUpperCase()}</span></p>
            <p><strong>Submitted:</strong> ${new Date(req.createdAt).toLocaleString()}</p>
            ${req.status === 'pending' ? `
                <button class="btn-edit" onclick="updateRequestStatus('${req._id}', 'contacted')">Mark as Contacted</button>
                <button class="btn-sold" onclick="updateRequestStatus('${req._id}', 'completed')">Mark as Completed</button>
            ` : ''}
        </div>
    `).join('');
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
            loadDashboardStats();
        } else {
            alert('Error marking car as sold');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error marking car as sold');
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/rental-requests/${requestId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadRentalRequests();
            loadDashboardStats();
        } else {
            alert('Error updating request status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating request status');
    }
}

// Contact Form
document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    e.target.reset();
});


