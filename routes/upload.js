const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1200;
const IMAGE_QUALITY = 80;

async function optimizeImageBuffer(buffer, outputPath) {
    await sharp(buffer)
        .rotate()
        .resize({
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: IMAGE_QUALITY })
        .toFile(outputPath);
}

// Configure multer for file storage in memory so we can optimize before saving
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|avif)$/i;
    const allowedMimeTypes = /^image\/(jpeg|jpg|png|gif|webp|avif)$/i;
    
    const extname = allowedExtensions.test(file.originalname);
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
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
// NOTE: maxCount must be >= the maximum number of files the frontend can send at once.
router.post('/images', auth, upload.array('images', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const fileUrls = [];
        for (const file of req.files) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = `car-${uniqueSuffix}.webp`;
            const outputPath = path.join(uploadsDir, fileName);

            await optimizeImageBuffer(file.buffer, outputPath);
            fileUrls.push(`/uploads/${fileName}`);
        }
        
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

async function optimizeAndSaveImage(fileBuffer, destinationFolder, prefix = 'car') {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${prefix}-${uniqueSuffix}.webp`;
    const destinationDir = path.join(uploadsDir, destinationFolder);

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const outputPath = path.join(destinationDir, fileName);
    await optimizeImageBuffer(fileBuffer, outputPath);
    return fileName;
}

// Upload rental request photos
router.post('/rental-photos/:requestId', auth, upload.array('photos', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const fileUrls = [];
        for (const file of req.files) {
            const fileName = await optimizeAndSaveImage(file.buffer, 'rental-photos', 'rental');
            fileUrls.push(`/uploads/rental-photos/${fileName}`);
        }
        
        res.json({ 
            message: 'Photos uploaded successfully',
            urls: fileUrls 
        });
    } catch (error) {
        console.error('Rental photo upload error:', error);
        res.status(500).json({ message: 'Error uploading photos', error: error.message });
    }
});

module.exports = router;

