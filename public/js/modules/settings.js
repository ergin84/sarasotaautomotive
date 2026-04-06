// Site Settings Module
import { appState, API_BASE, DEFAULT_BACKGROUND_OVERLAY } from './constants.js';
import { escapeHtml, updateMetaTags, buildTelHref, buildDirectionsUrl } from './utils.js';
import { showCustomConfirm } from './modals.js';
import { renderSocialLinks, populateSocialLinksEditor, updateSocialLinksInput, addNewSocialLink, handleChangePassword, updateFooterUserInfo } from './auth.js';
import { enableAnalyticsIfConsented } from './analytics.js';

export function initializeSiteSettings() {
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
                    'Authorization': `Bearer ${appState.authToken}`
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
                    'Authorization': `Bearer ${appState.authToken}`
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

    // Color picker synchronization
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

export function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));

    const activeTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
    const activeContent = document.querySelector(`.settings-tab-content[data-tab-content="${tabName}"]`);

    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    if (tabName === 'api-feeds') {
        updateApiFeedUrls();
    }
}

export function updateApiFeedUrls() {
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

export function fallbackCopy(text) {
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

export function showCopySuccess(element) {
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

export function setupColorPickerSync(colorPickerId, textInputId, defaultOpacity = 0.65) {
    const colorPicker = document.getElementById(colorPickerId);
    const textInput = document.getElementById(textInputId);

    if (colorPicker && textInput) {
        colorPicker.addEventListener('input', () => {
            const hex = colorPicker.value;
            const rgb = hexToRgb(hex);
            if (rgb) {
                const currentValue = textInput.value;
                const existingRgba = parseRgba(currentValue);
                const opacity = existingRgba ? existingRgba.a : defaultOpacity;
                textInput.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
            }
        });

        textInput.addEventListener('input', () => {
            const rgba = parseRgba(textInput.value);
            if (rgba) {
                colorPicker.value = rgbToHex(rgba.r, rgba.g, rgba.b);
            }
        });
    }
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

export function parseRgba(rgbaString) {
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

export async function loadSiteSettings() {
    try {
        const response = await fetch(`${API_BASE}/site-settings`, {
            headers: {
                'Authorization': `Bearer ${appState.authToken}`
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

export async function loadSiteSettingsForDisplay() {
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

export async function loadPrivacyPolicy() {
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

export function populateSiteSettingsForm(settings) {
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

    if (settings.logoUrl) {
        document.getElementById('logoPreviewImg').src = settings.logoUrl;
    }

    const bgImg = document.getElementById('bgPreviewImg');
    if (bgImg) {
        if (settings.backgroundImageUrl) {
            bgImg.src = settings.backgroundImageUrl;
        }
        const hasImageUrl = document.getElementById('backgroundImageUrl')?.value?.trim();
        bgImg.style.display = hasImageUrl ? 'block' : 'none';
    }

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

    document.getElementById('contractTerms').value = settings.contractTerms || '';
    document.getElementById('salesContractTerms').value = settings.salesContractTerms || '';

    document.getElementById('privacyPolicy').value = settings.privacyPolicy || '';

    if (settings.socialLinks && Array.isArray(settings.socialLinks)) {
        populateSocialLinksEditor(settings.socialLinks);
    }
}

export async function handleSiteSettingsSubmit(e) {
    e.preventDefault();
    hideSiteSettingsMessages();

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
                'Authorization': `Bearer ${appState.authToken}`
            },
            body: JSON.stringify(settingsData)
        });

        if (response.ok) {
            const updatedSettings = await response.json();
            applySiteSettings(updatedSettings);
            showSiteSettingsSuccess('Settings saved successfully!');
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

export function applySiteSettings(settings) {
    if (settings.siteTitle) {
        document.title = settings.siteTitle;
    }

    updateMetaTags(settings);

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

    if (settings.logoText) {
        document.querySelectorAll('.logo-text').forEach(el => {
            el.textContent = settings.logoText;
        });
        document.querySelectorAll('.home-identity-title').forEach(el => {
            el.textContent = settings.logoText;
        });
    }

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

    updateContactPageWithSettings(settings);

    const incomingAnalyticsId = (settings.googleAnalyticsId || '').trim();
    if (incomingAnalyticsId !== appState.googleAnalyticsId) {
        if (incomingAnalyticsId === '') {
            const oldScript = appState.currentAnalyticsId
                ? document.querySelector(`script[data-analytics-id="${appState.currentAnalyticsId}"]`)
                : null;
            if (oldScript && oldScript.parentNode) {
                oldScript.parentNode.removeChild(oldScript);
            }
            window.gaInitialized = false;
            window.dataLayer = undefined;
            window.gtag = undefined;
            appState.currentAnalyticsId = '';
        }
        appState.googleAnalyticsId = incomingAnalyticsId;
    }
    enableAnalyticsIfConsented();

    const hasCustomBackground = settings.backgroundImageUrl && settings.backgroundImageUrl.trim() !== '';
    const backgroundImage = hasCustomBackground ? settings.backgroundImageUrl.trim() : '/site_bg.avif';
    document.documentElement.style.setProperty('--site-background-image', `url('${backgroundImage}')`);
    document.documentElement.style.setProperty('--site-background-overlay', DEFAULT_BACKGROUND_OVERLAY);

    if (settings.menuBackgroundColor) {
        document.documentElement.style.setProperty('--menu-bg-color', settings.menuBackgroundColor);
    }
    if (settings.menuTextColor) {
        document.documentElement.style.setProperty('--menu-text-color', settings.menuTextColor);
    }
    if (settings.menuAccentColor) {
        document.documentElement.style.setProperty('--menu-accent-color', settings.menuAccentColor);
    }

    if (settings.containerBackgroundColor) {
        document.documentElement.style.setProperty('--container-bg-color', settings.containerBackgroundColor);
    }
    if (settings.containerBorderColor) {
        document.documentElement.style.setProperty('--container-border-color', settings.containerBorderColor);
    }
    if (settings.containerTextColor) {
        document.documentElement.style.setProperty('--container-text-color', settings.containerTextColor);
    }

    updatePrivacyPolicy(settings);

    if (settings.socialLinks && Array.isArray(settings.socialLinks)) {
        renderSocialLinks(settings.socialLinks);
    }

    updateFooterUserInfo();
}

export function formatPrivacyPolicy(text) {
    if (!text) return '';

    const escapedText = escapeHtml(text);

    const paragraphs = escapedText.split(/\n\n+/).filter(p => p.trim());

    if (paragraphs.length === 0) return '';

    let html = '';
    let isFirst = true;

    paragraphs.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;

        const lines = trimmed.split('\n');
        const firstLine = lines[0].trim();
        const isHeading = lines.length > 1 &&
                         firstLine.length < 80 &&
                         (firstLine.endsWith(':') || firstLine.match(/^[A-Z\s]+$/));

        if (isHeading) {
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

export function formatParagraphContent(text) {
    const lines = text.split('\n').filter(l => l.trim());
    let html = '';
    let inList = false;

    lines.forEach(line => {
        const trimmed = line.trim();

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

export function formatStrongText(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function updatePrivacyPolicy(settings) {
    const privacyContent = document.getElementById('privacyPolicyContent');
    if (!privacyContent) return;

    if (settings.privacyPolicy) {
        privacyContent.innerHTML = formatPrivacyPolicy(settings.privacyPolicy);
    } else {
        privacyContent.innerHTML = '<p class="privacy-intro">Privacy policy content will be displayed here once configured in Site Settings.</p>';
    }
}

export async function resetSiteSettings() {
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
        document.getElementById('siteTitle').value = 'Sarasota Automotive';
        document.getElementById('logoText').value = 'Sarasota Automotive';
        document.getElementById('phoneNumber').value = '(941) 555-0123';
        document.getElementById('emailAddress').value = 'info@sarasotaautomotive.com';
        document.getElementById('adminEmail').value = 'info@sarasotaautomotive.com';
        document.getElementById('address').value = '5671 McIntosh Rd Sarasota, FL 34233';
        document.getElementById('googleAnalyticsId').value = '';

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

export function showSiteSettingsError(message) {
    const errorDiv = document.getElementById('siteSettingsError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => hideSiteSettingsMessages(), 5000);
    }
}

export function showSiteSettingsSuccess(message) {
    const successDiv = document.getElementById('siteSettingsSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => hideSiteSettingsMessages(), 5000);
    }
}

export function hideSiteSettingsMessages() {
    const errorDiv = document.getElementById('siteSettingsError');
    const successDiv = document.getElementById('siteSettingsSuccess');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

// Contact page update (Lines 4446-4481)
export function updateContactPageWithSettings(settings = {}) {
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

// Global window assignment for copyToClipboard (used in onclick handlers in HTML)
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = element.textContent;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(element);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
};
