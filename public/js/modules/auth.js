// Auth Module
import { appState, API_BASE } from './constants.js';
import { escapeHtml } from './utils.js';
import { showPage, updateActiveNavForPage } from './navigation.js';

export async function handleApiResponse(response) {
    if (response.status === 401) {
        appState.authToken = null;
        appState.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateFooterUserInfo();
        if (window.location.hash.includes('admin')) {
            showPage('admin-login');
        }
        return false;
    }
    return true;
}

export function logout() {
    appState.authToken = null;
    appState.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateFooterUserInfo();
    showPage('home');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector('[data-page="home"]')?.classList.add('active');
}

export async function verifySession() {
    if (!appState.authToken) {
        appState.currentUser = null;
        localStorage.removeItem('currentUser');
        return;
    }

    if (!appState.currentUser && appState.authToken) {
        try {
            const payload = JSON.parse(atob(appState.authToken.split('.')[1]));
            if (payload.username) {
                appState.currentUser = { username: payload.username, role: payload.role };
                localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
            }
        } catch (e) {
            console.error('Error decoding token:', e);
        }
    }

    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${appState.authToken}` }
        });

        if (!response.ok) {
            appState.authToken = null;
            appState.currentUser = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    } catch (error) {
        console.error('Error verifying session:', error);
        appState.authToken = null;
        appState.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }
}

export function renderSocialLinks(socialLinks) {
    const container = document.querySelector('.sidebar-footer-socials');
    if (!container) return;

    container.innerHTML = '';

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

export function populateSocialLinksEditor(socialLinks) {
    const container = document.getElementById('socialLinksContainer');
    if (!container) return;

    container.innerHTML = '';

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

        const inputs = linkDiv.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', updateSocialLinksInput);
            input.addEventListener('input', updateSocialLinksInput);
        });

        container.appendChild(linkDiv);
    });

    updateSocialLinksInput();
}

export function updateSocialLinksInput() {
    const items = document.querySelectorAll('.social-link-item');
    const socialLinks = Array.from(items).map(item => ({
        name: item.querySelector('.social-link-name').value,
        url: item.querySelector('.social-link-url').value,
        icon: item.querySelector('.social-link-icon').value,
        displayOrder: parseInt(item.querySelector('.social-link-order').value, 10) || 0
    }));

    document.getElementById('socialLinks').value = JSON.stringify(socialLinks);
}

export function addNewSocialLink(e) {
    if (e) {
        e.preventDefault();
    }

    const container = document.getElementById('socialLinksContainer');
    if (!container) return;

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

    const inputs = linkDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', updateSocialLinksInput);
        input.addEventListener('input', updateSocialLinksInput);
    });

    container.appendChild(linkDiv);
    updateSocialLinksInput();
}

export async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    const errorEl = document.getElementById('passwordChangeError');
    const successEl = document.getElementById('passwordChangeSuccess');

    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

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

    if (!appState.authToken) {
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
                'Authorization': `Bearer ${appState.authToken}`
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
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

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

export function updateFooterUserInfo() {
    const footerAdminLink = document.querySelector('.footer-admin-link');
    if (!footerAdminLink) return;

    if (appState.authToken && appState.currentUser) {
        footerAdminLink.innerHTML = `
            <div class="footer-admin-status">
                <span class="footer-admin-text">You are logged in as <strong>${escapeHtml(appState.currentUser.username)}</strong></span>
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
            if (page === 'admin-dashboard' && !appState.authToken) {
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
