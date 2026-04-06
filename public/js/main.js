/**
 * Sarasota Automotive - Main Entry Point
 * Modular ES6 Architecture
 */

import { initializeLightbox } from './modules/lightbox.js';
import { verifySession, updateFooterUserInfo } from './modules/auth.js';
import { initializeNavigation, registerPageLoaders, loadInitialPage } from './modules/navigation.js';
import { initializeCookieConsent } from './modules/analytics.js';
import { initializeModals } from './modules/modals.js';
import { loadCarsForSale, loadCarsForRent, loadServices } from './modules/inventory.js';
import './modules/details.js';
import { loadAdminDashboard } from './modules/admin/dashboard.js';
import { loadPrivacyPolicy, loadSiteSettingsForDisplay } from './modules/settings.js';
import { initializeAdmin } from './modules/admin/init.js';

document.addEventListener('DOMContentLoaded', async () => {
    await verifySession();
    updateFooterUserInfo();
    registerPageLoaders({
        'inventory-sale': loadCarsForSale,
        'inventory-rent': loadCarsForRent,
        'services': loadServices,
        'admin': loadAdminDashboard,
        'privacy': loadPrivacyPolicy,
    });
    initializeNavigation();
    initializeCookieConsent();
    initializeModals();
    initializeAdmin();
    loadSiteSettingsForDisplay();
    loadInitialPage();
    initializeLightbox();
});
