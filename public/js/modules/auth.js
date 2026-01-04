// Authentication Module
import { API_BASE } from './constants.js';
import { escapeHtml } from './utils.js';

// State
export let authToken = localStorage.getItem('authToken');
export let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Update exports when token/user changes
export function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

export function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// Handle API responses and check for auth errors
export async function handleApiResponse(response) {
    if (response.status === 401) {
        // Token expired or invalid
        setAuthToken(null);
        setCurrentUser(null);
        updateFooterUserInfo();
        // Redirect to login if trying to access admin pages
        if (window.location.hash.includes('admin')) {
            const { showPage } = await import('./navigation.js');
            showPage('admin-login');
        }
        return false;
    }
    return true;
}

// Verify session on page load
export async function verifySession() {
    if (!authToken) {
        setCurrentUser(null);
        return;
    }

    // If we have a token but no user info, try to decode it
    if (!currentUser && authToken) {
        try {
            // Decode JWT token to get user info (without verification, just for display)
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            if (payload.username) {
                setCurrentUser({ username: payload.username, role: payload.role });
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
            setAuthToken(null);
            setCurrentUser(null);
        }
        // If response is ok, token is valid and we keep the stored user info
    } catch (error) {
        console.error('Error verifying session:', error);
        // On error, clear session
        setAuthToken(null);
        setCurrentUser(null);
    }
}

// Logout
export function logout() {
    setAuthToken(null);
    setCurrentUser(null);
    updateFooterUserInfo();
    
    import('./navigation.js').then(({ showPage, updateActiveNavForPage }) => {
        showPage('home');
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector('[data-page="home"]')?.classList.add('active');
    });
}

// Update footer to show user info when logged in
export function updateFooterUserInfo() {
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
        footerAdminLinkBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = footerAdminLinkBtn.getAttribute('data-page') || 'admin-login';
            const { showPage, updateActiveNavForPage } = await import('./navigation.js');
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
