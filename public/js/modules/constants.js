// API Configuration
export const API_BASE = '/api';

// Request Status Options
export const REQUEST_STATUS_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Client contacted' },
    { value: 'ongoing', label: 'Ongoing process' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'closed', label: 'Closed' }
];

// Pagination
export const REQUESTS_PER_PAGE = 6;

// Defaults
export const DEFAULT_BACKGROUND_OVERLAY = 'linear-gradient(180deg, rgba(1, 16, 24, 0.60), rgba(1, 48, 66, 0.35))';

// Cookie Consent
export const COOKIE_CONSENT_KEY = 'cookieConsent';

// Vehicle Options
export const VEHICLE_OPTIONS = [
    { value: 'compact', label: 'Compact' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'van', label: 'Van' },
    { value: 'pickup', label: 'Pickup Truck' },
    { value: 'convertible', label: 'Convertible' },
    { value: 'sports', label: 'Sports Car' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'minivan', label: 'Minivan' },
    { value: 'coupe', label: 'Coupe' },
    { value: 'wagon', label: 'Wagon' },
    { value: 'crossover', label: 'Crossover' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'truck', label: 'Truck' },
    { value: 'bus', label: 'Bus' },
    { value: 'other', label: 'Other' }
];

// Global state management
export const appState = {
    authToken: localStorage.getItem('authToken'),
    currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null'),
    currentPage: 'home',
    googleAnalyticsId: '',
    currentAnalyticsId: '',
    requestPaginationState: {
        rent: { page: 1, totalPages: 1, total: 0 },
        sale: { page: 1, totalPages: 1, total: 0 }
    }
};
