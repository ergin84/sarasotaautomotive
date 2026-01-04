const mongoose = require('mongoose');

// Canonical defaults (used for schema defaults and reset-to-defaults API)
const DEFAULT_SETTINGS = Object.freeze({
    siteTitle: 'Sarasota Automotive',
    logoUrl: '/logo.avif',
    logoText: 'Sarasota Automotive',
    backgroundImageUrl: '/site_bg.avif',
    phoneNumber: '(941) 555-0123',
    emailAddress: 'info@sarasotaautomotive.com',
    address: '5671 McIntosh Rd Sarasota, FL 34233',
    adminEmail: 'info@sarasotaautomotive.com',
    businessHours: 'Monday - Saturday: 9:00 AM - 6:00 PM\nSunday: Closed',
    menuBackgroundColor: 'rgba(8, 36, 48, 0.70)',
    menuTextColor: '#f4f7f9',
    menuAccentColor: '#85c4e4',
    containerBackgroundColor: 'rgba(14, 46, 60, 0.60)',
    containerBorderColor: 'rgba(194, 228, 242, 0.35)',
    containerTextColor: '#e6eef2',
    googleAnalyticsId: '',
    contractTerms: `By signing below, the renter agrees to return the vehicle in the same condition as received, except for normal wear and tear. Any damages beyond normal wear will be charged to the renter.

The renter is responsible for all traffic violations, tolls, and parking fees during the rental period.

Fuel must be returned at the same level as received, or a refueling fee will apply.`,
    salesContractTerms: `By signing below, the buyer agrees to purchase the vehicle as described in this contract for the agreed-upon price.

The vehicle is sold "as is" with no warranties expressed or implied, except as required by law.

The buyer is responsible for all transfer fees, registration, and title fees.

Full payment must be received before the vehicle title is transferred.`,
    privacyPolicy: `Sarasota Automotive LLC respects your privacy. This notice explains how we collect, use, and protect personal information that you share through our website forms.

Information We Collect

Contact Form: Name, email address, phone number, and the content of your message.
Vehicle Request Form: Name, email address, phone number, preferred contact method, and request details for rental or sale vehicles.

How We Use Your Information

- Respond to your enquiries and provide the services you request.
- Schedule appointments or follow up on rental and sale requests.
- Notify you about updates directly related to your enquiry.

How We Store and Share Data

- Information submitted through our forms is stored securely within our customer management tools.
- Only authorised Sarasota Automotive staff can access your data.
- We do not sell or share your personal information with third parties unless required by law.

Cookies and Tracking Technologies

We use cookies and similar technologies to ensure the site works correctly and to improve your experience.

Essential technical cookies: These are required for core site features such as navigation, security, form submissions, and showing the correct content. They are always active because the site cannot function without them.
Analytics cookies (optional): With your consent, we load Google Analytics to understand how visitors use the site and to help us make improvements. These cookies collect anonymised usage data such as page views, device/browser information, and general location.

Your Rights

- Request a copy of the information we hold about you.
- Ask us to update or delete your personal information.
- Withdraw consent for us to contact you at any time.

To exercise these rights, email us at info@sarasotaautomotive.com or call our office.

Updates

We may update this policy from time to time. The latest version will always be available on this page.`
});

const siteSettingsSchema = new mongoose.Schema({
    siteTitle: {
        type: String,
        default: DEFAULT_SETTINGS.siteTitle
    },
    logoUrl: {
        type: String,
        default: DEFAULT_SETTINGS.logoUrl
    },
    logoText: {
        type: String,
        default: DEFAULT_SETTINGS.logoText
    },
    backgroundImageUrl: {
        type: String,
        default: DEFAULT_SETTINGS.backgroundImageUrl
    },
    phoneNumber: {
        type: String,
        default: DEFAULT_SETTINGS.phoneNumber
    },
    emailAddress: {
        type: String,
        default: DEFAULT_SETTINGS.emailAddress
    },
    address: {
        type: String,
        default: DEFAULT_SETTINGS.address
    },
    adminEmail: {
        type: String,
        default: DEFAULT_SETTINGS.adminEmail
    },
    businessHours: {
        type: String,
        default: DEFAULT_SETTINGS.businessHours
    },
    menuBackgroundColor: {
        type: String,
        default: DEFAULT_SETTINGS.menuBackgroundColor
    },
    menuTextColor: {
        type: String,
        default: DEFAULT_SETTINGS.menuTextColor
    },
    menuAccentColor: {
        type: String,
        default: DEFAULT_SETTINGS.menuAccentColor
    },
    containerBackgroundColor: {
        type: String,
        default: DEFAULT_SETTINGS.containerBackgroundColor
    },
    containerBorderColor: {
        type: String,
        default: DEFAULT_SETTINGS.containerBorderColor
    },
    containerTextColor: {
        type: String,
        default: DEFAULT_SETTINGS.containerTextColor
    },
    googleAnalyticsId: {
        type: String,
        default: DEFAULT_SETTINGS.googleAnalyticsId
    },
    contractTerms: {
        type: String,
        default: DEFAULT_SETTINGS.contractTerms
    },
    salesContractTerms: {
        type: String,
        default: DEFAULT_SETTINGS.salesContractTerms
    },
    privacyPolicy: {
        type: String,
        default: DEFAULT_SETTINGS.privacyPolicy
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getDefaultSettings = function() {
    return { ...DEFAULT_SETTINGS };
};

siteSettingsSchema.statics.resetToDefaults = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = new this(DEFAULT_SETTINGS);
    } else {
        settings.set(DEFAULT_SETTINGS);
    }
    await settings.save();
    return settings;
};

siteSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = new this(DEFAULT_SETTINGS);
        await settings.save();
    }
    return settings;
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
SiteSettings.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

module.exports = SiteSettings;

