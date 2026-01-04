const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const auth = require('../middleware/auth');

// Admin routes MUST come before public routes with :id parameter
// Get all services including inactive (admin)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all services (public)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single service by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create service (admin)
router.post('/', auth, async (req, res) => {
  try {
    const { title, shortDescription, fullDescription, icon, images, mainImage, order, isActive } = req.body;
    
    const service = new Service({
      title,
      shortDescription,
      fullDescription,
      icon: icon || 'fas fa-cog',
      images: images || [],
      mainImage: mainImage || (images && images.length > 0 ? images[0] : null),
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, shortDescription, fullDescription, icon, images, mainImage, order, isActive } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        title,
        shortDescription,
        fullDescription,
        icon,
        images,
        mainImage: mainImage || (images && images.length > 0 ? images[0] : null),
        order,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete service (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
