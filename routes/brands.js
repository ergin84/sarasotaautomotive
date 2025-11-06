const express = require('express');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new brand (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Brand name is required' });
    }
    
    const brandName = name.trim();
    const brand = new Brand({ name: brandName });
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Brand already exists' });
    }
    res.status(400).json({ message: 'Error creating brand', error: error.message });
  }
});

// Get models for a brand
router.get('/:brandName/models', async (req, res) => {
  try {
    const brandName = decodeURIComponent(req.params.brandName);
    const models = await Model.find({ brand: brandName }).sort({ name: 1 });
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new model for a brand (admin only)
router.post('/:brandName/models', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Model name is required' });
    }
    
    const brandName = decodeURIComponent(req.params.brandName).trim();
    const modelName = name.trim();
    
    // Verify brand exists
    const brand = await Brand.findOne({ name: brandName });
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    
    const model = new Model({ 
      brand: brandName,
      name: modelName 
    });
    await model.save();
    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating model:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Model already exists for this brand' });
    }
    res.status(400).json({ message: 'Error creating model', error: error.message });
  }
});

module.exports = router;

