// Admin Init Module
import { appState, API_BASE } from '../constants.js';
import { showPage } from '../navigation.js';
import { logout, updateFooterUserInfo } from '../auth.js';
import { openModal, closeModal } from '../modals.js';
import { loadAdminDashboard, loadDashboardStats, loadAdminCars } from './dashboard.js';
import { loadClientRequests } from './requests.js';
import { loadAdminServices, openServiceForm, handleServiceFormSubmit, handleServiceImageUpload } from './services.js';
import { openCarForm, handleCarFormSubmit, loadBrands, loadModels, createImagePreviewItem } from './cars.js';
import { loadSiteSettings, initializeSiteSettings } from '../settings.js';
import { initializeRentalCalendarView } from './calendar.js';

export function initializeAdmin() {
    // Admin navigation
    document.querySelectorAll('.admin-nav-btn, .admin-nav-btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
                    targetSection.classList.add('active');
                    button.classList.add('active');

                    void targetSection.offsetHeight;

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

    // Admin login form
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
                appState.authToken = data.token;
                appState.currentUser = data.user;
                localStorage.setItem('authToken', appState.authToken);
                localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
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

    // Contact form submission
    document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmailInput').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();
        const submitButton = form.querySelector('button[type="submit"]');

        const existingError = form.querySelector('.contact-form-error');
        if (existingError) existingError.remove();
        const existingSuccess = form.querySelector('.contact-form-success');
        if (existingSuccess) existingSuccess.remove();

        if (!name || !email || !subject || !message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'contact-form-error';
            errorDiv.textContent = 'Please fill in all fields.';
            errorDiv.style.color = '#ff6b6b';
            errorDiv.style.marginTop = '10px';
            form.appendChild(errorDiv);
            return;
        }

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
                const successDiv = document.createElement('div');
                successDiv.className = 'contact-form-success';
                successDiv.textContent = 'Thank you! Your message has been sent successfully.';
                successDiv.style.color = '#51cf66';
                successDiv.style.marginTop = '10px';
                form.appendChild(successDiv);

                form.reset();

                setTimeout(() => {
                    successDiv.remove();
                }, 5000);
            } else {
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
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

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

        if (!appState.authToken) {
            alert('You must be logged in to add a brand. Please log in first.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/brands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appState.authToken}`
                },
                body: JSON.stringify({ name: brandName })
            });

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

        if (!appState.authToken) {
            alert('You must be logged in to add a model. Please log in first.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/brands/${encodeURIComponent(brandName)}/models`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appState.authToken}`
                },
                body: JSON.stringify({ name: modelName })
            });

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

    // Site Settings
    initializeSiteSettings();
}
