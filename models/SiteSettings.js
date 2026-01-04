const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
    siteTitle: {
        type: String,
        default: 'Sarasota Automotive'
    },
    logoUrl: {
        type: String,
        default: '/logo.avif'
    },
    logoText: {
        type: String,
        default: 'Sarasota Automotive'
    },
    backgroundImageUrl: {
        type: String,
        default: '/site_bg.avif'
    },
    phoneNumber: {
        type: String,
        default: '(941) 555-0123'
    },
    emailAddress: {
        type: String,
        default: 'info@sarasotaautomotive.com'
    },
    address: {
        type: String,
            default: '5671 McIntosh Rd Sarasota, FL 34233'
    },
    businessHours: {
        type: String,
        default: 'Monday - Saturday: 9:00 AM - 6:00 PM\nSunday: Closed'
    },
    adminEmail: {
        type: String,
        default: 'info@sarasotaautomotive.com'
    },
    menuBackgroundColor: {
        type: String,
        default: 'rgba(8, 36, 48, 0.70)'
    },
    menuTextColor: {
        type: String,
        default: '#f4f7f9'
    },
    menuAccentColor: {
        type: String,
        default: '#85c4e4'
    },
    containerBackgroundColor: {
        type: String,
        default: 'rgba(14, 46, 60, 0.60)'
    },
    containerBorderColor: {
        type: String,
        default: 'rgba(194, 228, 242, 0.35)'
    },
    containerTextColor: {
        type: String,
        default: '#e6eef2'
    },
    googleAnalyticsId: {
        type: String,
        default: ''
    },
    // SEO Settings
    metaDescription: {
        type: String,
        default: 'Sarasota Automotive - Premium car sales and rentals in Sarasota, FL. Quality vehicles, competitive prices, excellent service.'
    },
    metaKeywords: {
        type: String,
        default: 'car rental Sarasota, car sales Sarasota, automotive services, used cars Sarasota, vehicle rental Florida'
    },
    ogTitle: {
        type: String,
        default: 'Sarasota Automotive - Quality Cars for Sale and Rent'
    },
    ogDescription: {
        type: String,
        default: 'Premium car sales and rentals in Sarasota, FL. Browse our inventory of quality vehicles with competitive prices and excellent customer service.'
    },
    ogImage: {
        type: String,
        default: '/logo.avif'
    },
    twitterCard: {
        type: String,
        default: 'summary_large_image'
    },
    contractTerms: {
        type: String,
        default: `By signing below, the renter agrees to return the vehicle in the same condition as received, except for normal wear and tear. Any damages beyond normal wear will be charged to the renter.

The renter is responsible for all traffic violations, tolls, and parking fees during the rental period.

Fuel must be returned at the same level as received, or a refueling fee will apply.`
    },
    salesContractTerms: {
        type: String,
        default: `By signing below, the buyer agrees to purchase the vehicle as described in this contract for the agreed-upon price.

The vehicle is sold "as is" with no warranties expressed or implied, except as required by law.

The buyer is responsible for all transfer fees, registration, and title fees.

Full payment must be received before the vehicle title is transferred.`
    },
    socialLinks: {
        type: [
            {
                name: String,
                url: String,
                icon: String,
                displayOrder: { type: Number, default: 0 }
            }
        ],
        default: [
            {
                name: 'Facebook',
                url: 'https://www.facebook.com/SarasotaAutomotive/',
                icon: 'f',
                displayOrder: 0
            },
            {
                name: 'Yelp',
                url: 'https://www.yelp.com/biz/sarasota-automotive-llc-sarasota',
                icon: '★',
                displayOrder: 1
            },
            {
                name: 'YouTube',
                url: '',
                icon: '▶',
                displayOrder: 2
            }
        ]
    },
    privacyPolicy: {
        type: String,
        default: `Sarasota Automotive LLC respects your privacy. This notice explains how we collect, use, and protect personal information that you share through our website forms.

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
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = new this();
        await settings.save();
    }
    return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);

