const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'car-' + uniqueSuffix + ext);
    }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: fileFilter
});

// Upload multiple images
router.post('/images', auth, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        // Return array of file URLs
        const fileUrls = req.files.map(file => {
            return `/uploads/${file.filename}`;
        });
        
        res.json({ 
            message: 'Files uploaded successfully',
            urls: fileUrls 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Error uploading files', error: error.message });
    }
});

// Configure multer for logo upload
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'logo' + ext);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size for logo
    },
    fileFilter: fileFilter
});

// Upload logo
router.post('/logo', auth, logoUpload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        res.json({ 
            message: 'Logo uploaded successfully',
            url: `/uploads/${req.file.filename}` 
        });
    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ message: 'Error uploading logo', error: error.message });
    }
});

// Configure multer for background image upload
const bgStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'background' + ext);
    }
});

const bgUpload = multer({
    storage: bgStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size for background
    },
    fileFilter: fileFilter
});

// Upload background image
router.post('/background', auth, bgUpload.single('background'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        res.json({ 
            message: 'Background image uploaded successfully',
            url: `/uploads/${req.file.filename}` 
        });
    } catch (error) {
        console.error('Background upload error:', error);
        res.status(500).json({ message: 'Error uploading background image', error: error.message });
    }
});

module.exports = router;

