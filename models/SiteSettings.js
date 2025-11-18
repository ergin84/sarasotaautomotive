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
        default: '123 MAIN STREET, SARASOTA, FL 34236'
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

