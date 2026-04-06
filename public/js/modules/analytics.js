// Analytics Module
import { appState, COOKIE_CONSENT_KEY } from './constants.js';

export function initializeCookieConsent() {
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

export function enableAnalyticsIfConsented() {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted') {
        enableAnalytics();
    }
}

export function enableAnalytics() {
    const trimmedId = (appState.googleAnalyticsId || '').trim();
    if (!trimmedId) {
        return;
    }

    // If the ID changed, remove prior script and reset state
    if (appState.currentAnalyticsId && appState.currentAnalyticsId !== trimmedId) {
        const oldScript = document.querySelector(`script[data-analytics-id="${appState.currentAnalyticsId}"]`);
        if (oldScript && oldScript.parentNode) {
            oldScript.parentNode.removeChild(oldScript);
        }
        window.gaInitialized = false;
        window.dataLayer = undefined;
        window.gtag = undefined;
    }

    if (window.gaInitialized && appState.currentAnalyticsId === trimmedId) {
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
    appState.currentAnalyticsId = trimmedId;
}
