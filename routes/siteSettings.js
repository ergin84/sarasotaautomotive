const express = require('express');
const SiteSettings = require('../models/SiteSettings');
const auth = require('../middleware/auth');
const router = express.Router();

// Get site settings (public)
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/site-settings - Fetching settings');
        const settings = await SiteSettings.getSettings();
        if (!settings.backgroundImageUrl) {
            settings.backgroundImageUrl = '/site_bg.avif';
        }
        if (typeof settings.googleAnalyticsId !== 'string') {
            settings.googleAnalyticsId = '';
        }
        res.json(settings.toObject());
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get immutable defaults (useful for admin UI reset previews)
router.get('/defaults', auth, async (req, res) => {
    try {
        res.json(SiteSettings.getDefaultSettings());
    } catch (error) {
        console.error('Error fetching default site settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update site settings (admin only)
router.put('/', auth, async (req, res) => {
    try {
        console.log('PUT /api/site-settings - Updating settings:', req.body);
        let settings = await SiteSettings.findOne();
        
        if (!settings) {
            settings = new SiteSettings(req.body);
        } else {
            // Apply incoming fields without overriding schema strictness
            settings.set(req.body);
        }

        if (!settings.backgroundImageUrl) {
            settings.backgroundImageUrl = '/site_bg.avif';
        }
        if (typeof settings.googleAnalyticsId !== 'string') {
            settings.googleAnalyticsId = '';
        }

        await settings.save();
        console.log('Settings saved successfully');
        res.json(settings.toObject());
    } catch (error) {
        console.error('Error updating site settings:', error);
        res.status(400).json({ message: 'Error updating settings', error: error.message });
    }
});

// Reset to canonical defaults (admin only)
router.post('/reset', auth, async (req, res) => {
    try {
        console.log('POST /api/site-settings/reset - Resetting to defaults');
        const settings = await SiteSettings.resetToDefaults();
        res.json(settings.toObject());
    } catch (error) {
        console.error('Error resetting site settings:', error);
        res.status(500).json({ message: 'Error resetting settings', error: error.message });
    }
});

module.exports = router;

